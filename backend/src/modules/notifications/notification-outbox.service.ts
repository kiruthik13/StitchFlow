import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { EVENT_CATALOG, NotificationEventType } from './notification-catalog';
import { OutboxEventRow, RecipientResolverService } from './recipient-resolver.service';
import { ExpoPushService, PushMessagePayload } from './expo-push.service';

export interface EnqueueNotificationInput {
  organizationId: string;
  factoryId?: string | null;
  eventType: NotificationEventType;
  actorUserId?: string | null;
  entityType: string;
  entityId?: string | null;
  jobId?: string | null;
  bundleId?: string | null;
  productionLineId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
}

@Injectable()
export class NotificationOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationOutboxService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly resolver: RecipientResolverService,
    private readonly push: ExpoPushService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || !this.db.isDatabaseConfigured()) return;
    this.timer = setInterval(() => {
      void this.processPendingEvents();
    }, 5000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Must be called inside the same PostgreSQL transaction as the business mutation.
   * Uses idempotency_key ON CONFLICT DO NOTHING to guarantee zero duplicates on retries.
   */
  async enqueueInTransaction(client: PoolClient, input: EnqueueNotificationInput): Promise<void> {
    await client.query(
      `INSERT INTO public.notification_events (
        organization_id, factory_id, event_type, actor_user_id, entity_type, entity_id,
        job_id, bundle_id, production_line_id, event_payload, idempotency_key
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
      ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        input.organizationId,
        input.factoryId ?? null,
        input.eventType,
        input.actorUserId ?? null,
        input.entityType,
        input.entityId ?? null,
        input.jobId ?? null,
        input.bundleId ?? null,
        input.productionLineId ?? null,
        JSON.stringify(input.payload ?? {}),
        input.idempotencyKey,
      ],
    );
  }

  scheduleDrain(): void {
    if (process.env.NODE_ENV === 'test' || !this.db.isDatabaseConfigured()) return;
    setImmediate(() => {
      void this.processPendingEvents();
    });
  }

  async processPendingEvents(): Promise<number> {
    if (this.processing || !this.db.isDatabaseConfigured()) return 0;
    this.processing = true;
    let processedCount = 0;

    try {
      const { rows: events } = await this.db.query<OutboxEventRow>(
        `SELECT id, organization_id, factory_id, event_type, actor_user_id, entity_type, entity_id,
                job_id, bundle_id, production_line_id, event_payload
         FROM public.notification_events
         WHERE processing_status = 'pending' OR (processing_status = 'failed' AND retry_count < 3)
         ORDER BY occurred_at ASC
         LIMIT 25`,
      );

      for (const event of events) {
        try {
          await this.processSingleEvent(event);
          await this.db.query(
            `UPDATE public.notification_events
             SET processing_status = 'processed', processed_at = now(), last_error = NULL
             WHERE id = $1`,
            [event.id],
          );
          processedCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Outbox processing error';
          this.logger.warn(`Failed notification_event ${event.id}: ${msg}`);
          await this.db.query(
            `UPDATE public.notification_events
             SET processing_status = 'failed', retry_count = retry_count + 1, last_error = $2
             WHERE id = $1`,
            [event.id, msg.slice(0, 500)],
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Outbox poll skipped: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.processing = false;
    }

    return processedCount;
  }

  private async processSingleEvent(event: OutboxEventRow): Promise<void> {
    const meta = EVENT_CATALOG[event.event_type];
    if (!meta) return;

    const recipients = await this.resolver.resolveRecipients(event);
    if (recipients.length === 0) return;

    const pushBatch: PushMessagePayload[] = [];
    const groupKey = meta.groupWindowMinutes
      ? `${event.event_type}:${event.job_id ?? event.bundle_id ?? event.entity_id ?? 'global'}`
      : null;

    for (const recipient of recipients) {
      // Check user category preferences
      const { rows: prefRows } = await this.db.query<{ in_app_enabled: boolean; push_enabled: boolean }>(
        `SELECT in_app_enabled, push_enabled
         FROM public.notification_preferences
         WHERE user_id = $1 AND notification_category = $2`,
        [recipient.userId, meta.category],
      );
      const inAppEnabled = prefRows[0]?.in_app_enabled ?? true;
      const pushEnabled = prefRows[0]?.push_enabled ?? true;
      if (!inAppEnabled && !pushEnabled) continue;

      // Throttle / group repeated informational or bottleneck alerts within window
      if (groupKey && meta.groupWindowMinutes) {
        const { rows: recent } = await this.db.query<{ id: string }>(
          `SELECT id FROM public.notifications
           WHERE recipient_user_id = $1
             AND group_key = $2
             AND created_at >= now() - ($3::text || ' minutes')::interval
           LIMIT 1`,
          [recipient.userId, groupKey, String(meta.groupWindowMinutes)],
        );
        if (recent.length > 0) continue;
      }

      const params = {
        ...(event.event_payload ?? {}),
        ...(recipient.extraParams ?? {}),
      };
      const actionRoute = recipient.actionRoute ?? meta.defaultRoute;
      const actionParameters = recipient.actionParameters ?? {
        id: event.bundle_id ?? event.job_id ?? event.entity_id,
      };

      const { rows: inserted } = await this.db.query<{ id: string }>(
        `INSERT INTO public.notifications (
          event_id, recipient_user_id, organization_id, factory_id, category, priority,
          title_key, message_key, message_parameters, entity_type, entity_id,
          action_route, action_parameters, action_required, group_key
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13::jsonb,$14,$15)
        ON CONFLICT (event_id, recipient_user_id) DO NOTHING
        RETURNING id`,
        [
          event.id,
          recipient.userId,
          event.organization_id,
          event.factory_id,
          meta.category,
          meta.priority,
          meta.titleKey,
          meta.messageKey,
          JSON.stringify(params),
          event.entity_type,
          event.entity_id,
          actionRoute,
          JSON.stringify(actionParameters),
          meta.actionRequired,
          groupKey,
        ],
      );

      if (inserted[0] && pushEnabled) {
        pushBatch.push({
          notificationId: inserted[0].id,
          recipientUserId: recipient.userId,
          titleKey: meta.titleKey,
          messageKey: meta.messageKey,
          messageParameters: params,
          priority: meta.priority,
          actionRoute,
          actionParameters,
        });
      }
    }

    if (pushBatch.length > 0) {
      await this.push.sendPushNotifications(pushBatch);
    }
  }
}

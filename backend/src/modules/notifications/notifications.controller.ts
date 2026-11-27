import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { NOTIFICATION_EVENT_TYPES, NotificationCategory } from './notification-catalog';
import {
  ListNotificationsQuery,
  RegisterDeviceTokenInput,
  UpdatePreferenceInput,
} from './notifications.dto';

const ALL_CATEGORIES: NotificationCategory[] = [
  'work_orders',
  'production',
  'quality',
  'inventory',
  'packing_dispatch',
  'intelligence',
  'admin',
];

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQuery) {
    const limit = query.limit ?? 30;
    const unreadOnly = query.unreadOnly === 'true';
    const actionRequired = query.actionRequired === 'true';

    const { rows } = await this.db.query(
      `SELECT id, event_id AS "eventId", category, priority,
              title_key AS "titleKey", message_key AS "messageKey",
              message_parameters AS "messageParameters",
              entity_type AS "entityType", entity_id AS "entityId",
              action_route AS "actionRoute", action_parameters AS "actionParameters",
              action_required AS "actionRequired",
              read_at AS "readAt", action_completed_at AS "actionCompletedAt",
              created_at AS "createdAt"
       FROM public.notifications
       WHERE recipient_user_id = $1
         AND organization_id = $2
         AND ($3::text IS NULL OR category = $3)
         AND ($4::boolean = false OR read_at IS NULL)
         AND ($5::boolean = false OR action_required = true)
         AND ($6::timestamptz IS NULL OR created_at < $6::timestamptz)
       ORDER BY created_at DESC
       LIMIT $7`,
      [
        user.id,
        user.organizationId,
        query.category ?? null,
        unreadOnly,
        actionRequired,
        query.cursor ?? null,
        limit,
      ],
    );

    const nextCursor = rows.length === limit ? rows[rows.length - 1].createdAt : null;
    return { items: rows, nextCursor };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const { rows } = await this.db.query<{ unread: string; actionRequired: string }>(
      `SELECT COUNT(*) FILTER (WHERE read_at IS NULL)::text AS unread,
              COUNT(*) FILTER (WHERE read_at IS NULL AND action_required = true)::text AS "actionRequired"
       FROM public.notifications
       WHERE recipient_user_id = $1 AND organization_id = $2`,
      [user.id, user.organizationId],
    );
    return {
      unreadCount: Number(rows[0]?.unread ?? 0),
      actionRequiredCount: Number(rows[0]?.actionRequired ?? 0),
    };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    const { rows } = await this.db.query<{
      notification_category: NotificationCategory;
      in_app_enabled: boolean;
      push_enabled: boolean;
    }>(
      `SELECT notification_category, in_app_enabled, push_enabled
       FROM public.notification_preferences
       WHERE user_id = $1`,
      [user.id],
    );
    const map = new Map(rows.map((r) => [r.notification_category, r]));
    return ALL_CATEGORIES.map((category) => ({
      category,
      inAppEnabled: map.get(category)?.in_app_enabled ?? true,
      pushEnabled: map.get(category)?.push_enabled ?? true,
    }));
  }

  @Patch('preferences')
  async updatePreference(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdatePreferenceInput) {
    const { rows } = await this.db.query(
      `INSERT INTO public.notification_preferences (user_id, notification_category, in_app_enabled, push_enabled, updated_at)
       VALUES ($1, $2, COALESCE($3, true), COALESCE($4, true), now())
       ON CONFLICT (user_id, notification_category) DO UPDATE SET
         in_app_enabled = COALESCE($3, public.notification_preferences.in_app_enabled),
         push_enabled = COALESCE($4, public.notification_preferences.push_enabled),
         updated_at = now()
       RETURNING notification_category AS category, in_app_enabled AS "inAppEnabled", push_enabled AS "pushEnabled"`,
      [user.id, body.category, body.inAppEnabled ?? null, body.pushEnabled ?? null],
    );
    return rows[0];
  }

  @Post('devices/register')
  async registerDevice(@CurrentUser() user: AuthenticatedUser, @Body() body: RegisterDeviceTokenInput) {
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO public.user_device_tokens (
        user_id, organization_id, device_identifier, push_token, platform, is_active, last_registered_at, last_seen_at
      ) VALUES ($1, $2, $3, $4, $5, true, now(), now())
      ON CONFLICT (user_id, device_identifier) DO UPDATE SET
        push_token = EXCLUDED.push_token,
        platform = EXCLUDED.platform,
        is_active = true,
        last_registered_at = now(),
        last_seen_at = now()
      RETURNING id`,
      [user.id, user.organizationId, body.deviceIdentifier, body.pushToken, body.platform],
    );

    if (body.preferredLanguage) {
      await this.db.query(
        `UPDATE public.profiles SET preferred_language = $2 WHERE id = $1`,
        [user.id, body.preferredLanguage],
      );
    }

    return { id: rows[0].id, registered: true };
  }

  @Delete('devices/:id')
  async unregisterDevice(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const { rowCount } = await this.db.query(
      `UPDATE public.user_device_tokens
       SET is_active = false
       WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );
    if (!rowCount) throw new NotFoundException('Device registration not found');
    return { deactivated: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    const { rowCount } = await this.db.query(
      `UPDATE public.notifications
       SET read_at = now()
       WHERE recipient_user_id = $1 AND organization_id = $2 AND read_at IS NULL`,
      [user.id, user.organizationId],
    );
    return { updated: rowCount ?? 0 };
  }

  @Get(':id')
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const { rows } = await this.db.query(
      `SELECT id, event_id AS "eventId", category, priority,
              title_key AS "titleKey", message_key AS "messageKey",
              message_parameters AS "messageParameters",
              entity_type AS "entityType", entity_id AS "entityId",
              action_route AS "actionRoute", action_parameters AS "actionParameters",
              action_required AS "actionRequired",
              read_at AS "readAt", action_completed_at AS "actionCompletedAt",
              created_at AS "createdAt"
       FROM public.notifications
       WHERE id = $1 AND recipient_user_id = $2 AND organization_id = $3`,
      [id, user.id, user.organizationId],
    );
    if (!rows[0]) throw new NotFoundException('Notification not found');
    return rows[0];
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const { rows } = await this.db.query(
      `UPDATE public.notifications
       SET read_at = COALESCE(read_at, now())
       WHERE id = $1 AND recipient_user_id = $2 AND organization_id = $3
       RETURNING id, read_at AS "readAt"`,
      [id, user.id, user.organizationId],
    );
    if (!rows[0]) throw new NotFoundException('Notification not found');
    return rows[0];
  }

  @Get('meta/catalog')
  catalog() {
    return { eventTypes: NOTIFICATION_EVENT_TYPES };
  }
}

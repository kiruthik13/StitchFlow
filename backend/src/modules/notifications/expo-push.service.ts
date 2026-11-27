import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { NotificationPriority } from './notification-catalog';

export interface PushMessagePayload {
  notificationId: string;
  recipientUserId: string;
  titleKey: string;
  messageKey: string;
  messageParameters: Record<string, unknown>;
  priority: NotificationPriority;
  actionRoute: string;
  actionParameters: Record<string, unknown>;
}

const PUSH_TEMPLATES: Record<'en' | 'ta' | 'hi', Record<string, { title: string; body: string }>> = {
  en: {
    'notifications:events.JOB_APPROVAL_REQUESTED.title': {
      title: 'Work Order Approval Needed',
      body: 'Job {{jobCode}} is awaiting Factory Manager approval.',
    },
    'notifications:events.JOB_APPROVED.title': {
      title: 'Work Order Approved',
      body: 'Job {{jobCode}} has been approved and is ready for production.',
    },
    'notifications:events.JOB_REJECTED.title': {
      title: 'Work Order Rejected',
      body: 'Job {{jobCode}} was rejected. Review feedback.',
    },
    'notifications:events.CUTTING_COMPLETED.title': {
      title: 'Cutting Output Recorded',
      body: '{{quantity}} pcs cut for {{bundleCode}} ({{jobCode}}).',
    },
    'notifications:events.PRODUCTION_STAGE_COMPLETED.title': {
      title: 'Stage Completed',
      body: 'Bundle {{bundleCode}} completed {{stageCode}} ({{quantity}} pcs).',
    },
    'notifications:events.BUNDLE_READY_FOR_NEXT_STAGE.title': {
      title: 'Bundle Ready for Your Stage',
      body: 'Bundle {{bundleCode}} is ready for {{stageCode}}.',
    },
    'notifications:events.QC_INSPECTION_REQUESTED.title': {
      title: 'QC Inspection Required',
      body: 'Bundle {{bundleCode}} completed production and is ready for QC.',
    },
    'notifications:events.QC_REWORK_REQUESTED.title': {
      title: 'Rework Assigned',
      body: '{{rework}} pcs on {{bundleCode}} require rework.',
    },
    'notifications:events.QC_REWORK_COMPLETED.title': {
      title: 'Rework Ready for Reinspection',
      body: 'Rework completed on {{bundleCode}} ({{quantity}} pcs).',
    },
    'notifications:events.BUNDLE_READY_FOR_PACKING.title': {
      title: 'Ready for Packing',
      body: '{{quantity}} QC-released pcs on {{bundleCode}} ready to pack.',
    },
    'notifications:events.DISPATCH_APPROVAL_REQUESTED.title': {
      title: 'Dispatch Approval Needed',
      body: 'Shipment manifest for {{jobCode}} awaits Factory Manager approval.',
    },
    'notifications:events.DISPATCH_APPROVED.title': {
      title: 'Dispatch Approved',
      body: 'Dispatch approved. Ready for Store execution.',
    },
    'notifications:events.DISPATCH_COMPLETED.title': {
      title: 'Dispatch Completed',
      body: 'Shipment dispatched with gate-pass {{gatePass}}.',
    },
    'notifications:events.BOTTLENECK_CRITICAL.title': {
      title: 'Critical Production Bottleneck',
      body: '{{stage}} on {{lineName}} ({{jobCode}}) requires immediate attention.',
    },
    'notifications:events.BOTTLENECK_WARNING.title': {
      title: 'Bottleneck Warning',
      body: '{{stage}} on {{lineName}} ({{jobCode}}) is slowing down.',
    },
    'notifications:events.MACHINE_STOPPAGE_REPORTED.title': {
      title: 'Machine Stoppage Reported',
      body: 'Stoppage reported on {{lineName}}. Immediate review needed.',
    },
    'notifications:events.DEFAULT': {
      title: 'StitchFlow Production Update',
      body: 'New workflow update for {{jobCode}} {{bundleCode}}.',
    },
  },
  ta: {
    'notifications:events.JOB_APPROVAL_REQUESTED.title': {
      title: 'வேலை ஆணை ஒப்புதல் தேவை',
      body: 'வேலை {{jobCode}} தொழிற்சாலை மேலாளர் ஒப்புதலுக்காக காத்திருக்கிறது.',
    },
    'notifications:events.QC_INSPECTION_REQUESTED.title': {
      title: 'QC ஆய்வு தேவை',
      body: 'கட்டு {{bundleCode}} தையல் முடிந்து QC ஆய்விற்கு தயாராக உள்ளது.',
    },
    'notifications:events.QC_REWORK_REQUESTED.title': {
      title: 'மறுவேலை (Rework) ஒதுக்கப்பட்டது',
      body: '{{bundleCode}} கட்டில் {{rework}} துண்டுகள் மறுவேலை தேவை.',
    },
    'notifications:events.BUNDLE_READY_FOR_PACKING.title': {
      title: 'பேக்கிங்கிற்கு தயார்',
      body: '{{bundleCode}} கட்டில் {{quantity}} QC அனுமதி பெற்ற துண்டுகள் தயாராக உள்ளன.',
    },
    'notifications:events.BOTTLENECK_CRITICAL.title': {
      title: 'அவசர உற்பத்தி தடை',
      body: '{{lineName}} ({{jobCode}}) - {{stage}} நிலையில் உடனடி கவனம் தேவை.',
    },
    'notifications:events.DEFAULT': {
      title: 'StitchFlow உற்பத்தி தகவல்',
      body: '{{jobCode}} {{bundleCode}} புதிய பணி நிலை மாற்றம்.',
    },
  },
  hi: {
    'notifications:events.JOB_APPROVAL_REQUESTED.title': {
      title: 'कार्य आदेश स्वीकृति आवश्यक',
      body: 'जॉब {{jobCode}} फैक्ट्री मैनेजर की स्वीकृति की प्रतीक्षा कर रही है।',
    },
    'notifications:events.QC_INSPECTION_REQUESTED.title': {
      title: 'QC जांच आवश्यक',
      body: 'बंडल {{bundleCode}} उत्पादन पूरा कर QC जांच के लिए तैयार है।',
    },
    'notifications:events.QC_REWORK_REQUESTED.title': {
      title: 'रीवर्क असाइन किया गया',
      body: '{{bundleCode}} पर {{rework}} पीस में रीवर्क आवश्यक है।',
    },
    'notifications:events.BUNDLE_READY_FOR_PACKING.title': {
      title: 'पैकिंग के लिए तैयार',
      body: '{{bundleCode}} पर {{quantity}} QC-रिलीज़ पीस पैकिंग के लिए तैयार हैं।',
    },
    'notifications:events.BOTTLENECK_CRITICAL.title': {
      title: 'गंभीर उत्पादन बाधा',
      body: '{{lineName}} ({{jobCode}}) - {{stage}} पर तुरंत ध्यान दें।',
    },
    'notifications:events.DEFAULT': {
      title: 'StitchFlow उत्पादन अपडेट',
      body: '{{jobCode}} {{bundleCode}} के लिए नया अपडेट।',
    },
  },
};

function formatTemplate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = params[key];
    return val === undefined || val === null ? '' : String(val);
  }).replace(/\s+/g, ' ').trim();
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly db: DatabaseService) {}

  renderLocalizedText(
    lang: 'en' | 'ta' | 'hi',
    titleKey: string,
    params: Record<string, unknown>,
  ): { title: string; body: string } {
    const dict = PUSH_TEMPLATES[lang] ?? PUSH_TEMPLATES.en;
    const entry = dict[titleKey] ?? PUSH_TEMPLATES.en[titleKey] ?? dict['notifications:events.DEFAULT'] ?? PUSH_TEMPLATES.en['notifications:events.DEFAULT'];
    return {
      title: formatTemplate(entry.title, params),
      body: formatTemplate(entry.body, params),
    };
  }

  async sendPushNotifications(messages: PushMessagePayload[]): Promise<void> {
    if (messages.length === 0 || !this.db.isDatabaseConfigured()) return;

    const userIds = [...new Set(messages.map((m) => m.recipientUserId))];
    const { rows: tokenRows } = await this.db.query<{
      id: string;
      user_id: string;
      push_token: string;
      preferred_language: 'en' | 'ta' | 'hi' | null;
    }>(
      `SELECT t.id, t.user_id, t.push_token, p.preferred_language
       FROM public.user_device_tokens t
       JOIN public.profiles p ON p.id = t.user_id
       WHERE t.user_id = ANY($1::uuid[]) AND t.is_active = true AND p.account_status = 'active'`,
      [userIds],
    );

    if (tokenRows.length === 0) {
      for (const m of messages) {
        await this.logDelivery(m.notificationId, 'push', 'skipped', null, 'No active device token');
      }
      return;
    }

    const tokensByUser = new Map<string, typeof tokenRows>();
    for (const row of tokenRows) {
      const list = tokensByUser.get(row.user_id) ?? [];
      list.push(row);
      tokensByUser.set(row.user_id, list);
    }

    const expoPayloads: Array<{
      notificationId: string;
      tokenId: string;
      to: string;
      title: string;
      body: string;
      sound: 'default';
      priority: 'high' | 'normal';
      channelId: string;
      data: Record<string, unknown>;
    }> = [];

    for (const msg of messages) {
      const devices = tokensByUser.get(msg.recipientUserId) ?? [];
      if (devices.length === 0) {
        await this.logDelivery(msg.notificationId, 'push', 'skipped', null, 'No active device token');
        continue;
      }
      for (const dev of devices) {
        if (!dev.push_token.startsWith('ExponentPushToken[') && !dev.push_token.startsWith('ExpoPushToken[')) {
          continue;
        }
        const lang = dev.preferred_language ?? 'en';
        const { title, body } = this.renderLocalizedText(lang, msg.titleKey, msg.messageParameters);
        const channelId = msg.priority === 'CRITICAL'
          ? 'stitchflow-critical'
          : msg.priority === 'WARNING'
            ? 'stitchflow-actions'
            : 'stitchflow-updates';
        expoPayloads.push({
          notificationId: msg.notificationId,
          tokenId: dev.id,
          to: dev.push_token,
          title,
          body,
          sound: 'default',
          priority: msg.priority === 'CRITICAL' || msg.priority === 'WARNING' ? 'high' : 'normal',
          channelId,
          data: {
            notificationId: msg.notificationId,
            actionRoute: msg.actionRoute,
            actionParameters: msg.actionParameters,
          },
        });
      }
    }

    if (expoPayloads.length === 0) return;

    // Send in batches of 100 per Expo Push API spec
    for (let i = 0; i < expoPayloads.length; i += 100) {
      const batch = expoPayloads.slice(i, i + 100);
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            batch.map(({ to, title, body, sound, priority, channelId, data }) => ({
              to,
              title,
              body,
              sound,
              priority,
              channelId,
              data,
            })),
          ),
        });
        const json = (await res.json()) as { data?: Array<{ status: string; id?: string; message?: string; details?: { error?: string } }> };
        const tickets = json.data ?? [];
        for (let idx = 0; idx < batch.length; idx++) {
          const item = batch[idx];
          const ticket = tickets[idx];
          if (ticket?.status === 'ok') {
            await this.logDelivery(item.notificationId, 'push', 'sent', ticket.id ?? null, null);
          } else {
            const errCode = ticket?.details?.error ?? ticket?.message ?? 'Expo push error';
            if (errCode === 'DeviceNotRegistered') {
              await this.db.query(`UPDATE public.user_device_tokens SET is_active = false WHERE id = $1`, [item.tokenId]);
            }
            await this.logDelivery(item.notificationId, 'push', 'failed', null, errCode);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Push network failure';
        this.logger.warn(`Expo Push batch failed: ${errMsg}`);
        for (const item of batch) {
          await this.logDelivery(item.notificationId, 'push', 'failed', null, errMsg);
        }
      }
    }
  }

  private async logDelivery(
    notificationId: string,
    channel: 'in_app' | 'realtime' | 'push',
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped',
    receiptId: string | null,
    error: string | null,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO public.notification_delivery_logs (notification_id, delivery_channel, delivery_status, provider_receipt_id, last_error)
         VALUES ($1, $2, $3, $4, $5)`,
        [notificationId, channel, status, receiptId, error],
      );
    } catch {
      // Never fail business flow on delivery logging
    }
  }
}

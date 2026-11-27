-- StitchFlow Notification & Workflow Event System
-- Migration 0023: Transactional Outbox, Notifications, Device Tokens, Preferences, Delivery Logs & Private Realtime

BEGIN;

-- 1. Optional preferred language on profiles for localized push delivery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
  CHECK (preferred_language IN ('en', 'ta', 'hi'));

-- 2. Durable Transactional Outbox Events
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES public.bundles(id) ON DELETE CASCADE,
  production_line_id UUID REFERENCES public.production_lines(id) ON DELETE SET NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_events_status_occurred
  ON public.notification_events (processing_status, occurred_at)
  WHERE processing_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notification_events_org_factory
  ON public.notification_events (organization_id, factory_id, occurred_at DESC);

-- 3. Persistent User Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'work_orders', 'production', 'quality', 'inventory', 'packing_dispatch', 'intelligence', 'admin'
  )),
  priority TEXT NOT NULL DEFAULT 'INFORMATION' CHECK (priority IN (
    'INFORMATION', 'SUCCESS', 'WARNING', 'CRITICAL'
  )),
  title_key TEXT NOT NULL,
  message_key TEXT NOT NULL,
  message_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action_route TEXT,
  action_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_required BOOLEAN NOT NULL DEFAULT false,
  group_key TEXT,
  read_at TIMESTAMPTZ,
  action_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notifications_event_recipient UNIQUE (event_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_feed
  ON public.notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_group_key
  ON public.notifications (recipient_user_id, group_key, created_at DESC)
  WHERE group_key IS NOT NULL;

-- 4. Multi-Device Push Tokens (Expo / Android FCM)
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_identifier TEXT NOT NULL,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_device_identifier UNIQUE (user_id, device_identifier)
);

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_active
  ON public.user_device_tokens (user_id, is_active)
  WHERE is_active = true;

-- 5. Per-User Category Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_category TEXT NOT NULL CHECK (notification_category IN (
    'work_orders', 'production', 'quality', 'inventory', 'packing_dispatch', 'intelligence', 'admin'
  )),
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_category)
);

-- 6. Delivery & Receipt Audit Log
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('in_app', 'realtime', 'push')),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  provider_receipt_id TEXT,
  last_error TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notif
  ON public.notification_delivery_logs (notification_id, delivery_channel);

-- 7. Row Level Security (Strict Recipient & Organization Isolation)
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own notifications, tokens, and preferences
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() AND organization_id = public.current_user_org_id());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid() AND organization_id = public.current_user_org_id())
  WITH CHECK (recipient_user_id = auth.uid() AND organization_id = public.current_user_org_id());

CREATE POLICY device_tokens_own ON public.user_device_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. Private User Realtime Broadcast Policy & Trigger
CREATE POLICY stitchflow_user_notifications_realtime ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND (SELECT realtime.topic()) = 'stitchflow:user:' || auth.uid()::text
  );

CREATE OR REPLACE FUNCTION stitchflow_internal.notify_user_inbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id,
      'category', NEW.category,
      'priority', NEW.priority,
      'titleKey', NEW.title_key,
      'messageKey', NEW.message_key,
      'messageParameters', NEW.message_parameters,
      'actionRoute', NEW.action_route,
      'actionParameters', NEW.action_parameters,
      'actionRequired', NEW.action_required,
      'createdAt', NEW.created_at
    ),
    'new_notification',
    'stitchflow:user:' || NEW.recipient_user_id::text,
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'StitchFlow user notification broadcast failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION stitchflow_internal.notify_user_inbox() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_user_inbox ON public.notifications;
CREATE TRIGGER trg_notify_user_inbox
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION stitchflow_internal.notify_user_inbox();

COMMIT;

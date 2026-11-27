import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationOutboxService } from './notification-outbox.service';
import { RecipientResolverService } from './recipient-resolver.service';
import { ExpoPushService } from './expo-push.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [RecipientResolverService, ExpoPushService, NotificationOutboxService],
  exports: [NotificationOutboxService, RecipientResolverService, ExpoPushService],
})
export class NotificationsModule {}

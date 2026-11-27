import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationCategory } from './notification-catalog';

const CATEGORIES: NotificationCategory[] = [
  'work_orders',
  'production',
  'quality',
  'inventory',
  'packing_dispatch',
  'intelligence',
  'admin',
];

export class ListNotificationsQuery {
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: NotificationCategory;

  @IsOptional()
  @IsIn(['true', 'false'])
  unreadOnly?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  actionRequired?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;
}

export class RegisterDeviceTokenInput {
  @IsString()
  @MaxLength(128)
  deviceIdentifier!: string;

  @IsString()
  @MaxLength(512)
  pushToken!: string;

  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';

  @IsOptional()
  @IsIn(['en', 'ta', 'hi'])
  preferredLanguage?: 'en' | 'ta' | 'hi';
}

export class UpdatePreferenceInput {
  @IsIn(CATEGORIES)
  category!: NotificationCategory;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}

import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class DecisionInput {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @Matches(/\S/)
  @MaxLength(500)
  reason?: string;
}

export class GenerateBundleInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;

  @Matches(/\S/)
  @MaxLength(32)
  size!: string;

  @Matches(/\S/)
  @MaxLength(32)
  color!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;
}

export class BarcodeInput {
  @Matches(/^[\x20-\x7E\x1D]{1,512}$/, { message: 'Barcode must be 1 to 512 printable ASCII or GS1 characters' })
  barcode!: string;

  @IsOptional()
  @MaxLength(64)
  symbology?: string;

  @IsOptional()
  @IsIn(['camera', 'bluetooth_hid', 'usb_hid', 'hid', 'manual'])
  inputSource?: 'camera' | 'bluetooth_hid' | 'usb_hid' | 'hid' | 'manual';

  @IsOptional()
  @MaxLength(512)
  rawPayload?: string;
}

export class ReprintInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;

  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}

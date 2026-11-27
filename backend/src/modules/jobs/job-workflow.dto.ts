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
  @Matches(/^BND-[0-9a-f]{32}$/i)
  barcode!: string;
}

export class ReprintInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;

  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}

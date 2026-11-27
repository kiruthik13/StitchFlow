import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class OutputInInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  bundleId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  locationId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;
}

export class OutputOutInput extends OutputInInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  destinationLineId!: string;
}

export class HandoverDecisionInput {
  @IsIn(['received', 'rejected'])
  status!: 'received' | 'rejected';

  @IsInt()
  @Min(0)
  @Max(100000000)
  actualQuantity!: number;

  @IsOptional()
  @Matches(/\S/)
  @MaxLength(500)
  reason?: string;
}

export class DiscrepancyReturnInput {
  @IsInt()
  @Min(1)
  @Max(100000000)
  verifiedQuantity!: number;

  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}

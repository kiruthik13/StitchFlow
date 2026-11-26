import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class OutputInInput {
  @IsUUID()
  bundleId!: string;

  @IsUUID()
  locationId!: string;

  @IsUUID()
  requestId!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;
}

export class OutputOutInput extends OutputInInput {
  @IsUUID()
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

import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class BundleRequest {
  @IsUUID()
  bundleId!: string;

  @IsUUID()
  requestId!: string;
}

export class StageCompletion extends BundleRequest {
  @IsUUID()
  stepId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  clientOccurredAt?: string;
}

export class QuantityRequest extends BundleRequest {
  @IsInt()
  @Min(1)
  @Max(100000000)
  quantity!: number;
}

export class QualityDisposition extends BundleRequest {
  @IsInt()
  @Min(0)
  @Max(100000000)
  passed!: number;

  @IsInt()
  @Min(0)
  @Max(100000000)
  rejected!: number;

  @IsInt()
  @Min(0)
  @Max(100000000)
  rework!: number;

  @IsInt()
  @Min(0)
  @Max(100000000)
  held!: number;
}

export class QualityReinspection extends QualityDisposition {
  @IsInt()
  @Min(0)
  @Max(100000000)
  fromRework!: number;

  @IsInt()
  @Min(0)
  @Max(100000000)
  fromHold!: number;
}

import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const masterTables = {
  buyers: 'buyers',
  styles: 'garment_styles',
} as const;
export type MasterKind = keyof typeof masterTables;

export class FactoryQuery {
  @IsUUID()
  factoryId!: string;

  @IsOptional()
  @IsUUID()
  after?: string;
}

export class JobListQuery {
  @IsOptional()
  @IsUUID()
  factoryId?: string;

  @IsOptional()
  @IsUUID()
  after?: string;
}

export class MasterInput {
  @IsUUID()
  factoryId!: string;

  @Matches(/\S/)
  @MaxLength(48)
  code!: string;

  @Matches(/\S/)
  @MaxLength(160)
  name!: string;
}

export class MasterUpdateInput extends MasterInput {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class JobItemInput {
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

export class JobInput {
  @IsUUID()
  factoryId!: string;

  @IsUUID()
  buyerId!: string;

  @IsUUID()
  styleId!: string;

  @IsUUID()
  lineId!: string;

  @Matches(/\S/)
  @MaxLength(48)
  jobCode!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  orderQuantity!: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(32, { each: true })
  colors!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(32, { each: true })
  sizes!: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => JobItemInput)
  items?: JobItemInput[];
}

export class JobStatusInput {
  @IsIn(['active', 'on-hold', 'cancelled'])
  status!: 'active' | 'on-hold' | 'cancelled';
}

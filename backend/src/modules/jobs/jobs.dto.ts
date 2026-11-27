import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const masterTables = {
  buyers: 'buyers',
  styles: 'garment_styles',
} as const;
export type MasterKind = keyof typeof masterTables;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FactoryQuery {
  @Matches(uuidPattern, { message: 'factoryId must be a UUID' })
  factoryId!: string;

  @IsOptional()
  @Matches(uuidPattern, { message: 'after must be a UUID' })
  after?: string;
}

export class JobListQuery {
  @IsOptional()
  @Matches(uuidPattern, { message: 'factoryId must be a UUID' })
  factoryId?: string;

  @IsOptional()
  @Matches(uuidPattern, { message: 'after must be a UUID' })
  after?: string;
}

export class MasterInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  factoryId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  buyerId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  styleId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
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

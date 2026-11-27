import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';
import { RoleCode } from '../../common/types/auth-user.type';

export class ApproveEmployeeDto {
  @ApiProperty({ enum: ['active', 'rejected'] })
  @IsIn(['active', 'rejected'])
  decision!: 'active' | 'rejected';

  @ApiPropertyOptional({
    enum: ['md', 'factory-manager', 'supervisor', 'operator', 'qc-inspector', 'store-dispatch', 'packing-staff'],
  })
  @IsOptional()
  @IsIn(['md', 'factory-manager', 'supervisor', 'operator', 'qc-inspector', 'store-dispatch', 'packing-staff'])
  role?: RoleCode;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  factoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  lineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateAccountStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProvisionRosterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  employeeId!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  factoryId!: string;
}

export class UpdateRosterStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

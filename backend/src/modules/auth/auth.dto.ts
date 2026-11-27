import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'priya@stitchflow.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RegisterEmployeeDto {
  @ApiProperty({ example: 'EMP-1042' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^\S(?:.*\S)?$/)
  employeeId!: string;

  @ApiProperty({ example: 'Karthik Rajan' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(/\S/)
  name!: string;

  @ApiProperty({ example: 'karthik@stitchflow.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Organization UUID' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  organizationId!: string;

  @ApiProperty({ description: 'Factory UUID' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  factoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9 ()-]{5,23}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  // Self-registration is strictly limited to non-privileged floor roles;
  // management roles (md, factory-manager) can only be assigned by authorized admins during approval.
  @ApiPropertyOptional({ enum: ['operator', 'qc-inspector', 'store-dispatch', 'packing-staff'], default: 'operator' })
  @IsOptional()
  @IsIn(['operator', 'qc-inspector', 'store-dispatch', 'packing-staff'])
  requestedRole?: 'operator' | 'qc-inspector' | 'store-dispatch' | 'packing-staff';
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

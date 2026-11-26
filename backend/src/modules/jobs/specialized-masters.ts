import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from './jobs.dto';
import { factoryScope, jobScopeParams } from './jobs.service';

export class CuttingMasterInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(48) code!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) specialization?: string;
}

export class CuttingMasterUpdateInput {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(48) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) specialization?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ContactInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(48) code!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiPropertyOptional({ enum: ['buyer', 'supplier', 'logistics', 'internal', 'other'] })
  @IsOptional() @IsIn(['buyer', 'supplier', 'logistics', 'internal', 'other']) contactType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(160) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) company?: string;
}

export class ContactUpdateInput {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(48) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional({ enum: ['buyer', 'supplier', 'logistics', 'internal', 'other'] })
  @IsOptional() @IsIn(['buyer', 'supplier', 'logistics', 'internal', 'other']) contactType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(160) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) company?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class RankInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(48) code!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) levelOrder?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) baseRate?: number;
}

export class RankUpdateInput {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(48) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) levelOrder?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) baseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class TailorMappingInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsUUID() lineId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) operatorName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) employeeId?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) operationName!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(48) machineCode!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) targetPace?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) actualPace?: number;
  @ApiPropertyOptional({ enum: ['optimal', 'slow', 'inactive'] })
  @IsOptional() @IsIn(['optimal', 'slow', 'inactive']) status?: string;
}

export class TailorMappingUpdateInput {
  @ApiPropertyOptional() @IsOptional() @IsUUID() lineId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) operatorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) operationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(48) machineCode?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) targetPace?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) actualPace?: number;
  @ApiPropertyOptional({ enum: ['optimal', 'slow', 'inactive'] })
  @IsOptional() @IsIn(['optimal', 'slow', 'inactive']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ConfigUpsertInput {
  @ApiProperty() @IsUUID() factoryId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) configKey!: string;
  @ApiProperty() @IsString() @MaxLength(1000) configValue!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;
}

@Injectable()
export class SpecializedMastersService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async assertFactory(user: AuthenticatedUser, factoryId: string) {
    const { rowCount } = await this.db.query(
      `SELECT 1 FROM public.factories f WHERE ${factoryScope} AND f.id = $4`,
      [...jobScopeParams(user), factoryId],
    );
    if (!rowCount) throw new ForbiddenException('Factory is outside your authorized scope');
  }

  async listCuttingMasters(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT m.id, m.factory_id AS "factoryId", m.code, m.name, m.phone, m.specialization, m.is_active AS "isActive"
       FROM public.cutting_masters m
       JOIN public.factories f ON f.id = m.factory_id
       WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR m.id > $5)
       ORDER BY m.id LIMIT 100`,
      [...jobScopeParams(user), query.factoryId, query.after ?? null],
    );
    return rows;
  }

  async createCuttingMaster(user: AuthenticatedUser, body: CuttingMasterInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      try {
        const { rows: [row] } = await client.query(
          `INSERT INTO public.cutting_masters (factory_id, code, name, phone, specialization)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, factory_id AS "factoryId", code, name, phone, specialization, is_active AS "isActive"`,
          [body.factoryId, body.code.trim(), body.name.trim(), body.phone?.trim() ?? null, body.specialization?.trim() ?? null],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: body.factoryId, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'CUTTING_MASTER_CREATED', entityType: 'cutting_master', entityId: row.id, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Cutting master code already exists');
        throw e;
      }
    });
  }

  async updateCuttingMaster(user: AuthenticatedUser, id: string, body: CuttingMasterUpdateInput) {
    if (!Object.keys(body).length) throw new BadRequestException('No update fields provided');
    return this.db.withTransaction(async client => {
      const existing = await client.query(
        `SELECT m.id, m.factory_id, m.code, m.name, m.phone, m.specialization, m.is_active
         FROM public.cutting_masters m JOIN public.factories f ON f.id = m.factory_id
         WHERE ${factoryScope} AND m.id = $4 FOR UPDATE OF m`,
        [...jobScopeParams(user), id],
      );
      const prev = existing.rows[0];
      if (!prev) throw new NotFoundException('Cutting master not found');
      try {
        const { rows: [row] } = await client.query(
          `UPDATE public.cutting_masters
           SET code = COALESCE($1, code), name = COALESCE($2, name), phone = COALESCE($3, phone),
               specialization = COALESCE($4, specialization), is_active = COALESCE($5, is_active)
           WHERE id = $6
           RETURNING id, factory_id AS "factoryId", code, name, phone, specialization, is_active AS "isActive"`,
          [body.code?.trim() ?? null, body.name?.trim() ?? null, body.phone?.trim() ?? null,
           body.specialization?.trim() ?? null, body.isActive ?? null, id],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: prev.factory_id, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'CUTTING_MASTER_UPDATED', entityType: 'cutting_master', entityId: id,
          previousValues: prev, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Cutting master code already exists');
        throw e;
      }
    });
  }

  async listContacts(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT c.id, c.factory_id AS "factoryId", c.code, c.name, c.contact_type AS "contactType",
              c.phone, c.email, c.company, c.is_active AS "isActive"
       FROM public.contacts c
       JOIN public.factories f ON f.id = c.factory_id
       WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR c.id > $5)
       ORDER BY c.id LIMIT 100`,
      [...jobScopeParams(user), query.factoryId, query.after ?? null],
    );
    return rows;
  }

  async createContact(user: AuthenticatedUser, body: ContactInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      try {
        const { rows: [row] } = await client.query(
          `INSERT INTO public.contacts (factory_id, code, name, contact_type, phone, email, company)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, factory_id AS "factoryId", code, name, contact_type AS "contactType", phone, email, company, is_active AS "isActive"`,
          [body.factoryId, body.code.trim(), body.name.trim(), body.contactType ?? 'other',
           body.phone?.trim() ?? null, body.email?.trim().toLowerCase() ?? null, body.company?.trim() ?? null],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: body.factoryId, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'CONTACT_CREATED', entityType: 'contact', entityId: row.id, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Contact code already exists');
        throw e;
      }
    });
  }

  async updateContact(user: AuthenticatedUser, id: string, body: ContactUpdateInput) {
    if (!Object.keys(body).length) throw new BadRequestException('No update fields provided');
    return this.db.withTransaction(async client => {
      const existing = await client.query(
        `SELECT c.id, c.factory_id, c.code, c.name, c.contact_type, c.phone, c.email, c.company, c.is_active
         FROM public.contacts c JOIN public.factories f ON f.id = c.factory_id
         WHERE ${factoryScope} AND c.id = $4 FOR UPDATE OF c`,
        [...jobScopeParams(user), id],
      );
      const prev = existing.rows[0];
      if (!prev) throw new NotFoundException('Contact not found');
      try {
        const { rows: [row] } = await client.query(
          `UPDATE public.contacts
           SET code = COALESCE($1, code), name = COALESCE($2, name), contact_type = COALESCE($3, contact_type),
               phone = COALESCE($4, phone), email = COALESCE($5, email), company = COALESCE($6, company),
               is_active = COALESCE($7, is_active)
           WHERE id = $8
           RETURNING id, factory_id AS "factoryId", code, name, contact_type AS "contactType", phone, email, company, is_active AS "isActive"`,
          [body.code?.trim() ?? null, body.name?.trim() ?? null, body.contactType ?? null,
           body.phone?.trim() ?? null, body.email?.trim().toLowerCase() ?? null,
           body.company?.trim() ?? null, body.isActive ?? null, id],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: prev.factory_id, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'CONTACT_UPDATED', entityType: 'contact', entityId: id, previousValues: prev, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Contact code already exists');
        throw e;
      }
    });
  }

  async listRanks(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT r.id, r.factory_id AS "factoryId", r.code, r.name, r.level_order AS "levelOrder",
              r.base_rate::float8 AS "baseRate", r.is_active AS "isActive"
       FROM public.ranks r
       JOIN public.factories f ON f.id = r.factory_id
       WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR r.id > $5)
       ORDER BY r.level_order ASC, r.id LIMIT 100`,
      [...jobScopeParams(user), query.factoryId, query.after ?? null],
    );
    return rows;
  }

  async createRank(user: AuthenticatedUser, body: RankInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      try {
        const { rows: [row] } = await client.query(
          `INSERT INTO public.ranks (factory_id, code, name, level_order, base_rate)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, factory_id AS "factoryId", code, name, level_order AS "levelOrder", base_rate::float8 AS "baseRate", is_active AS "isActive"`,
          [body.factoryId, body.code.trim(), body.name.trim(), body.levelOrder ?? 1, body.baseRate ?? 0],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: body.factoryId, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'RANK_CREATED', entityType: 'rank', entityId: row.id, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Rank code already exists');
        throw e;
      }
    });
  }

  async updateRank(user: AuthenticatedUser, id: string, body: RankUpdateInput) {
    if (!Object.keys(body).length) throw new BadRequestException('No update fields provided');
    return this.db.withTransaction(async client => {
      const existing = await client.query(
        `SELECT r.id, r.factory_id, r.code, r.name, r.level_order, r.base_rate, r.is_active
         FROM public.ranks r JOIN public.factories f ON f.id = r.factory_id
         WHERE ${factoryScope} AND r.id = $4 FOR UPDATE OF r`,
        [...jobScopeParams(user), id],
      );
      const prev = existing.rows[0];
      if (!prev) throw new NotFoundException('Rank not found');
      try {
        const { rows: [row] } = await client.query(
          `UPDATE public.ranks
           SET code = COALESCE($1, code), name = COALESCE($2, name), level_order = COALESCE($3, level_order),
               base_rate = COALESCE($4, base_rate), is_active = COALESCE($5, is_active)
           WHERE id = $6
           RETURNING id, factory_id AS "factoryId", code, name, level_order AS "levelOrder", base_rate::float8 AS "baseRate", is_active AS "isActive"`,
          [body.code?.trim() ?? null, body.name?.trim() ?? null, body.levelOrder ?? null,
           body.baseRate ?? null, body.isActive ?? null, id],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: prev.factory_id, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'RANK_UPDATED', entityType: 'rank', entityId: id, previousValues: prev, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Rank code already exists');
        throw e;
      }
    });
  }

  async listTailorMappings(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT tm.id, tm.factory_id AS "factoryId", tm.line_id AS "lineId", pl.name AS "lineName",
              tm.operator_name AS "operatorName", tm.employee_id AS "employeeId",
              tm.operation_name AS "operationName", tm.machine_code AS "machineCode",
              tm.target_pace AS "targetPace", tm.actual_pace AS "actualPace",
              tm.status, tm.is_active AS "isActive"
       FROM public.tailor_mappings tm
       JOIN public.factories f ON f.id = tm.factory_id
       JOIN public.production_lines pl ON pl.id = tm.line_id AND pl.factory_id = tm.factory_id
       WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR tm.id > $5)
       ORDER BY tm.machine_code ASC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId, query.after ?? null],
    );
    return rows;
  }

  async createTailorMapping(user: AuthenticatedUser, body: TailorMappingInput) {
    await this.assertFactory(user, body.factoryId);
    return this.db.withTransaction(async client => {
      const line = await client.query(
        'SELECT 1 FROM public.production_lines WHERE id = $1 AND factory_id = $2 AND is_active',
        [body.lineId, body.factoryId],
      );
      if (!line.rowCount) throw new BadRequestException('Production line does not belong to this factory');
      try {
        const { rows: [row] } = await client.query(
          `INSERT INTO public.tailor_mappings (factory_id, line_id, operator_name, employee_id, operation_name, machine_code, target_pace, actual_pace, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, factory_id AS "factoryId", line_id AS "lineId", operator_name AS "operatorName",
                     employee_id AS "employeeId", operation_name AS "operationName", machine_code AS "machineCode",
                     target_pace AS "targetPace", actual_pace AS "actualPace", status, is_active AS "isActive"`,
          [body.factoryId, body.lineId, body.operatorName.trim(), body.employeeId?.trim() ?? null,
           body.operationName.trim(), body.machineCode.trim(), body.targetPace ?? 40, body.actualPace ?? 0, body.status ?? 'optimal'],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: body.factoryId, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'TAILOR_MAPPING_CREATED', entityType: 'tailor_mapping', entityId: row.id, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Machine code already mapped in this factory');
        throw e;
      }
    });
  }

  async updateTailorMapping(user: AuthenticatedUser, id: string, body: TailorMappingUpdateInput) {
    if (!Object.keys(body).length) throw new BadRequestException('No update fields provided');
    return this.db.withTransaction(async client => {
      const existing = await client.query(
        `SELECT tm.* FROM public.tailor_mappings tm JOIN public.factories f ON f.id = tm.factory_id
         WHERE ${factoryScope} AND tm.id = $4 FOR UPDATE OF tm`,
        [...jobScopeParams(user), id],
      );
      const prev = existing.rows[0];
      if (!prev) throw new NotFoundException('Tailor mapping not found');
      if (body.lineId) {
        const line = await client.query(
          'SELECT 1 FROM public.production_lines WHERE id = $1 AND factory_id = $2 AND is_active',
          [body.lineId, prev.factory_id],
        );
        if (!line.rowCount) throw new BadRequestException('Production line does not belong to this factory');
      }
      try {
        const { rows: [row] } = await client.query(
          `UPDATE public.tailor_mappings
           SET line_id = COALESCE($1, line_id), operator_name = COALESCE($2, operator_name),
               employee_id = COALESCE($3, employee_id), operation_name = COALESCE($4, operation_name),
               machine_code = COALESCE($5, machine_code), target_pace = COALESCE($6, target_pace),
               actual_pace = COALESCE($7, actual_pace), status = COALESCE($8, status),
               is_active = COALESCE($9, is_active), updated_at = NOW()
           WHERE id = $10
           RETURNING id, factory_id AS "factoryId", line_id AS "lineId", operator_name AS "operatorName",
                     employee_id AS "employeeId", operation_name AS "operationName", machine_code AS "machineCode",
                     target_pace AS "targetPace", actual_pace AS "actualPace", status, is_active AS "isActive"`,
          [body.lineId ?? null, body.operatorName?.trim() ?? null, body.employeeId?.trim() ?? null,
           body.operationName?.trim() ?? null, body.machineCode?.trim() ?? null,
           body.targetPace ?? null, body.actualPace ?? null, body.status ?? null, body.isActive ?? null, id],
        );
        await this.audit.record({
          organizationId: user.organizationId, factoryId: prev.factory_id, actorId: user.id,
          actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
          action: 'TAILOR_MAPPING_UPDATED', entityType: 'tailor_mapping', entityId: id,
          previousValues: prev, newValues: row,
        }, client);
        return row;
      } catch (e: unknown) {
        if ((e as { code?: string }).code === '23505') throw new ConflictException('Machine code already mapped in this factory');
        throw e;
      }
    });
  }

  async listConfigs(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(
      `SELECT c.id, c.factory_id AS "factoryId", c.config_key AS "configKey", c.config_value AS "configValue",
              c.description, c.updated_at AS "updatedAt"
       FROM public.configurations c
       JOIN public.factories f ON f.id = c.factory_id
       WHERE ${factoryScope} AND f.id = $4
       ORDER BY c.config_key ASC LIMIT 100`,
      [...jobScopeParams(user), query.factoryId],
    );
    return rows;
  }

  async upsertConfig(user: AuthenticatedUser, body: ConfigUpsertInput) {
    await this.assertFactory(user, body.factoryId);
    const key = body.configKey.trim();
    return this.db.withTransaction(async client => {
      const { rows: [row] } = await client.query(
        `INSERT INTO public.configurations (factory_id, config_key, config_value, description, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (factory_id, config_key) DO UPDATE
         SET config_value = EXCLUDED.config_value,
             description = COALESCE(EXCLUDED.description, configurations.description),
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()
         RETURNING id, factory_id AS "factoryId", config_key AS "configKey", config_value AS "configValue",
                   description, updated_at AS "updatedAt"`,
        [body.factoryId, key, body.configValue, body.description?.trim() ?? null, user.id],
      );
      await this.audit.record({
        organizationId: user.organizationId, factoryId: body.factoryId, actorId: user.id,
        actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
        action: 'CONFIGURATION_UPSERTED', entityType: 'configuration', entityId: row.id, newValues: row,
      }, client);
      return row;
    });
  }
}

@ApiTags('Masters')
@ApiBearerAuth()
@Controller('masters')
export class SpecializedMastersController {
  constructor(private readonly masters: SpecializedMastersService) {}

  @Get('cutting-masters')
  listCuttingMasters(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.masters.listCuttingMasters(user, query);
  }

  @Post('cutting-masters')
  @RequirePermissions('CAN_MANAGE_JOBS')
  createCuttingMaster(@CurrentUser() user: AuthenticatedUser, @Body() body: CuttingMasterInput) {
    return this.masters.createCuttingMaster(user, body);
  }

  @Patch('cutting-masters/:id')
  @RequirePermissions('CAN_MANAGE_JOBS')
  updateCuttingMaster(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: CuttingMasterUpdateInput) {
    return this.masters.updateCuttingMaster(user, id, body);
  }

  @Get('contacts')
  listContacts(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.masters.listContacts(user, query);
  }

  @Post('contacts')
  @RequirePermissions('CAN_MANAGE_JOBS')
  createContact(@CurrentUser() user: AuthenticatedUser, @Body() body: ContactInput) {
    return this.masters.createContact(user, body);
  }

  @Patch('contacts/:id')
  @RequirePermissions('CAN_MANAGE_JOBS')
  updateContact(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: ContactUpdateInput) {
    return this.masters.updateContact(user, id, body);
  }

  @Get('ranks')
  listRanks(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.masters.listRanks(user, query);
  }

  @Post('ranks')
  @RequirePermissions('CAN_MANAGE_JOBS')
  createRank(@CurrentUser() user: AuthenticatedUser, @Body() body: RankInput) {
    return this.masters.createRank(user, body);
  }

  @Patch('ranks/:id')
  @RequirePermissions('CAN_MANAGE_JOBS')
  updateRank(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: RankUpdateInput) {
    return this.masters.updateRank(user, id, body);
  }

  @Get('tailor-mappings')
  listTailorMappings(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.masters.listTailorMappings(user, query);
  }

  @Post('tailor-mappings')
  @RequirePermissions('CAN_MANAGE_JOBS')
  createTailorMapping(@CurrentUser() user: AuthenticatedUser, @Body() body: TailorMappingInput) {
    return this.masters.createTailorMapping(user, body);
  }

  @Patch('tailor-mappings/:id')
  @RequirePermissions('CAN_MANAGE_JOBS')
  updateTailorMapping(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: TailorMappingUpdateInput) {
    return this.masters.updateTailorMapping(user, id, body);
  }

  @Get('configs')
  listConfigs(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) {
    return this.masters.listConfigs(user, query);
  }

  @Put('configs')
  @RequirePermissions('CAN_MANAGE_JOBS')
  upsertConfig(@CurrentUser() user: AuthenticatedUser, @Body() body: ConfigUpsertInput) {
    return this.masters.upsertConfig(user, body);
  }
}

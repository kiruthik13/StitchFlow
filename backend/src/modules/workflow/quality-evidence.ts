import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Post, ServiceUnavailableException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { createHash } from 'crypto';
import { PoolClient } from 'pg';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

class MeasurementSpecInput {
  @Matches(/\S/)
  @MaxLength(32)
  size!: string;

  @Matches(/\S/)
  @MaxLength(80)
  point!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  minimumMm!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  maximumMm!: number;
}

class MeasurementInput {
  @IsUUID()
  requestId!: string;

  @IsUUID()
  specId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  measuredMm!: number;
}

class UploadId {
  @IsUUID()
  requestId!: string;
}

interface FileInput { buffer: Buffer; size: number; mimetype: string }
interface Scope { id: string; size: string; style_id: string; factory_id: string; status: string }
const bucket = 'stitchflow-qc-evidence';
const maxBytes = 5 * 1024 * 1024;

export function identifyEvidenceImage(file: FileInput | undefined) {
  if (!file?.buffer || file.buffer.length > maxBytes) throw new BadRequestException('Evidence photo is missing or too large');
  const image = file.buffer;
  const png = image.length >= 24 && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = image.length >= 8 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
    && image[image.length - 2] === 0xff && image[image.length - 1] === 0xd9;
  if (png && file.mimetype === 'image/png') return { contentType: 'image/png', extension: 'png' };
  if (jpeg && file.mimetype === 'image/jpeg') return { contentType: 'image/jpeg', extension: 'jpg' };
  throw new BadRequestException('Evidence must be a JPEG or PNG image');
}

@Injectable()
export class QualityEvidenceService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async addSpec(user: AuthenticatedUser, styleId: string, input: MeasurementSpecInput) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('Only a Factory Manager may enter a measurement specification');
    if (input.maximumMm < input.minimumMm) throw new BadRequestException('Maximum tolerance is below its minimum');
    return this.db.withTransaction(async client => {
      const { rows: [spec] } = await client.query(`
        INSERT INTO public.garment_measurement_specs (style_id, size, point, minimum_mm, maximum_mm)
        SELECT s.id, $5,$6,$7,$8 FROM public.garment_styles s
        JOIN public.factories f ON f.id = s.factory_id
        WHERE ${factoryScope} AND s.id = $4 AND s.is_active
        ON CONFLICT DO NOTHING RETURNING *`,
        [...jobScopeParams(user), styleId, input.size.trim(), input.point.trim(), input.minimumMm, input.maximumMm]);
      if (!spec) throw new ConflictException('Style unavailable or measurement point already configured');
      await this.audit.record({
        organizationId: user.organizationId, actorId: user.id, actorEmployeeId: user.employeeId,
        actorName: user.name, actorRole: user.role, action: 'MEASUREMENT_SPEC_CREATED',
        entityType: 'measurement_spec', entityId: spec.id, newValues: { styleId, size: spec.size, point: spec.point },
      }, client);
      return spec;
    });
  }

  async list(user: AuthenticatedUser, bundleId: string) {
    return this.db.withTransaction(async client => {
      const scope = await this.scope(client, user, bundleId);
      const { rows: specs } = await client.query(`
        SELECT id, point, minimum_mm::float AS "minimumMm", maximum_mm::float AS "maximumMm"
        FROM public.garment_measurement_specs WHERE style_id = $1 AND size = $2 ORDER BY point LIMIT 100`,
        [scope.style_id, scope.size]);
      const { rows: measurements } = await client.query(`
        SELECT id, spec_id AS "specId", measured_mm::float AS "measuredMm",
          within_tolerance AS "withinTolerance", created_at AS "createdAt"
        FROM public.bundle_measurements WHERE bundle_id = $1 ORDER BY created_at DESC LIMIT 100`, [bundleId]);
      const { rows: photos } = await client.query(
        'SELECT id, created_at AS "createdAt" FROM public.bundle_quality_photos WHERE bundle_id = $1 ORDER BY created_at DESC LIMIT 100',
        [bundleId],
      );
      const { rows: [request] } = await client.query<{ id: string }>('SELECT gen_random_uuid() AS id');
      return { specs, measurements, photos, requestId: request.id };
    });
  }

  async measure(user: AuthenticatedUser, bundleId: string, input: MeasurementInput) {
    return this.db.withTransaction(async client => {
      const scope = await this.scope(client, user, bundleId, true);
      const { rows: [previous] } = await client.query(`
        SELECT id, bundle_id, spec_id, measured_mm::float AS "measuredMm", within_tolerance AS "withinTolerance"
        FROM public.bundle_measurements WHERE actor_id = $1 AND request_id = $2`, [user.id, input.requestId]);
      if (previous) {
        if (previous.bundle_id !== bundleId || previous.spec_id !== input.specId || previous.measuredMm !== input.measuredMm) {
          throw new ConflictException('Measurement request was already used');
        }
        return previous;
      }
      if (scope.status !== 'active') throw new ConflictException('Only active jobs can accept evidence');
      const { rows: [saved] } = await client.query(`
        INSERT INTO public.bundle_measurements (bundle_id, spec_id, actor_id, request_id, measured_mm, within_tolerance)
        SELECT $1,s.id,$5,$6,$7,$7::numeric BETWEEN s.minimum_mm AND s.maximum_mm
        FROM public.garment_measurement_specs s WHERE s.style_id = $2 AND s.size = $3 AND s.id = $4
        ON CONFLICT DO NOTHING RETURNING id, measured_mm::float AS "measuredMm", within_tolerance AS "withinTolerance"`,
        [bundleId, scope.style_id, scope.size, input.specId, user.id, input.requestId, input.measuredMm]);
      if (!saved) throw new ConflictException('Measurement point unavailable or request already used');
      await this.record(client, user, scope, 'QUALITY_MEASUREMENT_RECORDED', { measurementId: saved.id, specId: input.specId });
      return saved;
    });
  }

  async photo(user: AuthenticatedUser, bundleId: string, requestId: string, file: FileInput | undefined) {
    const format = identifyEvidenceImage(file);
    const buffer = file!.buffer;
    const digest = createHash('sha256').update(buffer).digest('hex');
    return this.db.withTransaction(async client => {
      const scope = await this.scope(client, user, bundleId, true);
      const { rows: [previous] } = await client.query(
        'SELECT id, bundle_id, content_hash FROM public.bundle_quality_photos WHERE actor_id = $1 AND request_id = $2',
        [user.id, requestId],
      );
      if (previous) {
        if (previous.bundle_id !== bundleId || previous.content_hash !== digest) throw new ConflictException('Photo request was already used');
        return { id: previous.id };
      }
      if (scope.status !== 'active') throw new ConflictException('Only active jobs can accept evidence');
      const path = `${user.organizationId}/${bundleId}/${user.id}/${requestId}-${digest}.${format.extension}`;
      const storage = this.db.getSupabaseAdmin().storage.from(bucket);
      const upload = await storage.upload(path, buffer, { contentType: format.contentType, upsert: true });
      if (upload.error) throw new ServiceUnavailableException('Photo storage is unavailable');
      const { rows: [photo] } = await client.query(`
        INSERT INTO public.bundle_quality_photos (bundle_id, actor_id, request_id, object_path, content_hash)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
        [bundleId, user.id, requestId, path, digest]);
      if (!photo) throw new ConflictException('Photo request was already used');
      await this.record(client, user, scope, 'QUALITY_PHOTO_RECORDED', { photoId: photo.id });
      return photo;
    });
  }

  async viewPhoto(user: AuthenticatedUser, bundleId: string, photoId: string) {
    const path = await this.db.withTransaction(async client => {
      await this.scope(client, user, bundleId);
      const { rows: [photo] } = await client.query<{ object_path: string }>(
        'SELECT object_path FROM public.bundle_quality_photos WHERE id = $1 AND bundle_id = $2', [photoId, bundleId],
      );
      if (!photo) throw new NotFoundException('Photo not found for this bundle');
      return photo.object_path;
    });
    const { data, error } = await this.db.getSupabaseAdmin().storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data) throw new ServiceUnavailableException('Photo storage is unavailable');
    return { url: data.signedUrl };
  }

  private async scope(client: PoolClient, user: AuthenticatedUser, bundleId: string, write = false): Promise<Scope> {
    if (write && user.role !== 'qc-inspector') throw new ForbiddenException('Only assigned QC staff can record evidence');
    const { rows: [result] } = await client.query<Scope>(`
      SELECT b.id, b.size, j.style_id, f.id AS factory_id, j.status
      FROM public.bundles b JOIN public.jobs j ON j.id = b.job_id JOIN public.factories f ON f.id = j.factory_id
      WHERE ${factoryScope} AND b.id = $4 AND ($5::boolean OR EXISTS (
        SELECT 1 FROM public.job_quality_assignments w JOIN public.user_assignments a ON a.id = w.assignment_id
        JOIN public.production_lines l ON l.id = a.line_id AND l.factory_id = f.id AND l.is_active
        JOIN public.departments d ON d.id = a.department_id AND d.id = l.department_id AND d.is_active
        JOIN public.units u ON u.id = a.unit_id AND u.id = d.unit_id AND u.factory_id = f.id AND u.is_active
        WHERE w.job_id = j.id AND w.duty = 'qc' AND a.profile_id = $3 AND a.factory_id = f.id AND a.is_active
      )) ${write ? 'FOR UPDATE OF b, j' : ''}`, [...jobScopeParams(user), bundleId, user.role === 'factory-manager']);
    if (!result || (user.role !== 'factory-manager' && user.role !== 'qc-inspector')) throw new NotFoundException('Bundle evidence is unavailable');
    return result;
  }

  private record(client: PoolClient, user: AuthenticatedUser, scope: Scope, action: string, values: object) {
    return this.audit.record({
      organizationId: user.organizationId, factoryId: scope.factory_id, actorId: user.id,
      actorEmployeeId: user.employeeId, actorName: user.name, actorRole: user.role,
      action, entityType: 'bundle', entityId: scope.id, newValues: { ...values },
    }, client);
  }
}

@ApiTags('Quality evidence')
@ApiBearerAuth()
@Controller()
export class QualityEvidenceController {
  constructor(private readonly evidence: QualityEvidenceService) {}

  @Post('masters/styles/:id/measurement-specs')
  @RequirePermissions('CAN_MANAGE_JOBS')
  spec(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: MeasurementSpecInput) {
    return this.evidence.addSpec(user, id, body);
  }

  @Get('quality/bundles/:id/evidence')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  list(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.evidence.list(user, id);
  }

  @Post('quality/bundles/:id/measurements')
  @RequirePermissions('CAN_PERFORM_QC')
  measure(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: MeasurementInput) {
    return this.evidence.measure(user, id, body);
  }

  @Post('quality/bundles/:id/photos')
  @RequirePermissions('CAN_PERFORM_QC')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { limits: { files: 1, fileSize: maxBytes, fields: 1 } }))
  upload(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UploadId, @UploadedFile() photo?: FileInput) {
    return this.evidence.photo(user, id, body.requestId, photo);
  }

  @Get('quality/bundles/:id/photos/:photoId')
  @RequirePermissions('CAN_LOOKUP_BARCODE')
  view(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.evidence.viewPhoto(user, id, photoId);
  }
}

import { Body, ConflictException, Controller, ForbiddenException, Get, Header, Injectable, NotFoundException, Param, ParseUUIDPipe, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsUUID, Matches, MaxLength } from 'class-validator';
import { PoolClient } from 'pg';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { buildPdfBuffer } from '../../common/utilities/document-export';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from '../jobs/jobs.dto';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

class ShipmentInput {
  @IsUUID()
  factoryId!: string;

  @IsUUID()
  requestId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  cartonIds!: string[];

  @Matches(/\S/)
  @MaxLength(140)
  carrier!: string;

  @Matches(/\S/)
  @MaxLength(60)
  vehicle!: string;

  @Matches(/\S/)
  @MaxLength(60)
  seal!: string;

  @Matches(/\S/)
  @MaxLength(160)
  destination!: string;
}

@Injectable()
export class ShipmentsService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async list(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT m.id, m.carrier, m.vehicle, m.seal, m.destination, m.approved_at AS "approvedAt",
        m.dispatched_at AS "dispatchedAt", m.gate_pass AS "gatePass",
        (SELECT COUNT(*)::integer FROM public.shipment_manifest_cartons mc WHERE mc.manifest_id = m.id) AS cartons,
        (SELECT COALESCE(SUM(c.quantity),0)::float8 FROM public.shipment_manifest_cartons mc
         JOIN public.bundle_cartons c ON c.id = mc.carton_id WHERE mc.manifest_id = m.id) AS quantity
      FROM public.shipment_manifests m JOIN public.factories f ON f.id = m.factory_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR m.id > $5)
      ORDER BY m.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async create(user: AuthenticatedUser, input: ShipmentInput) {
    this.role(user, 'store-dispatch');
    return this.db.withTransaction(async client => {
      const { rows: jobs } = await client.query<{ id: string; carton_id: string; status: string }>(`
        SELECT j.id, c.id AS carton_id, j.status FROM public.bundle_cartons c
        JOIN public.bundles b ON b.id = c.bundle_id JOIN public.jobs j ON j.id = b.job_id
        JOIN public.factories f ON f.id = j.factory_id
        JOIN public.carton_store_receipts r ON r.carton_id = c.id
        WHERE ${factoryScope} AND f.id = $4 AND c.id = ANY($5::uuid[])
        ORDER BY j.id, c.id FOR UPDATE OF j`, [...jobScopeParams(user), input.factoryId, input.cartonIds]);
      if (jobs.length !== input.cartonIds.length) throw new ConflictException('Every carton must be received in this factory');
      const fields = [input.carrier.trim(), input.vehicle.trim(), input.seal.trim(), input.destination.trim()];
      const { rows: [previous] } = await client.query(`
        SELECT m.*, ARRAY(SELECT mc.carton_id::text FROM public.shipment_manifest_cartons mc
          WHERE mc.manifest_id = m.id ORDER BY mc.carton_id) AS carton_ids
        FROM public.shipment_manifests m WHERE m.created_by = $1 AND m.request_id = $2`,
        [user.id, input.requestId]);
      if (previous) {
        if (previous.factory_id !== input.factoryId || [previous.carrier, previous.vehicle, previous.seal, previous.destination]
          .some((value, index) => value !== fields[index])
          || JSON.stringify(previous.carton_ids) !== JSON.stringify([...input.cartonIds].sort())) {
          throw new ConflictException('Shipment request ID was already used');
        }
        return previous;
      }
      if (jobs.some(job => job.status !== 'active')) throw new ConflictException('All cartons require active jobs');
      const { rowCount: existing } = await client.query(`
        SELECT 1 FROM public.bundle_cartons c WHERE c.id = ANY($1::uuid[]) AND (
          EXISTS (SELECT 1 FROM public.shipment_manifest_cartons mc WHERE mc.carton_id = c.id)
          OR EXISTS (SELECT 1 FROM public.carton_dispatch d WHERE d.carton_id = c.id)
        ) LIMIT 1`, [input.cartonIds]);
      if (existing) throw new ConflictException('A carton is already assigned to a shipment or dispatch');
      const { rows: [manifest] } = await client.query(`
        INSERT INTO public.shipment_manifests (factory_id, carrier, vehicle, seal, destination, created_by, request_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING *`,
        [input.factoryId, ...fields, user.id, input.requestId]);
      if (!manifest) throw new ConflictException('Shipment request ID was already used');
      await client.query(`
        INSERT INTO public.shipment_manifest_cartons (manifest_id, carton_id)
        SELECT $1, carton_id FROM unnest($2::uuid[]) AS input(carton_id)`, [manifest.id, input.cartonIds]);
      await this.log(client, user, input.factoryId, manifest.id, 'SHIPMENT_CREATED', { cartons: input.cartonIds.length });
      return manifest;
    });
  }

  async transition(user: AuthenticatedUser, id: string, execute: boolean) {
    this.role(user, execute ? 'store-dispatch' : 'factory-manager');
    return this.db.withTransaction(async client => {
      const { rows: [manifest] } = await client.query(`
        SELECT m.* FROM public.shipment_manifests m JOIN public.factories f ON f.id = m.factory_id
        WHERE ${factoryScope} AND m.id = $4 FOR UPDATE OF m`, [...jobScopeParams(user), id]);
      if (!manifest) throw new NotFoundException('Shipment not found in assigned factory');
      if ((!execute && manifest.approved_at) || (execute && manifest.dispatched_at)) return manifest;
      if ((!execute && manifest.created_by === user.id)
        || (execute && (!manifest.approved_by || manifest.approved_by === user.id))) {
        throw new ConflictException('Shipment requires separate approval before execution');
      }
      const { rows: cartons } = await client.query<{ carton_id: string; status: string }>(`
        SELECT mc.carton_id, j.status FROM public.shipment_manifest_cartons mc
        JOIN public.bundle_cartons c ON c.id = mc.carton_id JOIN public.bundles b ON b.id = c.bundle_id
        JOIN public.jobs j ON j.id = b.job_id
        WHERE mc.manifest_id = $1 ORDER BY j.id, mc.carton_id FOR UPDATE OF j`, [id]);
      if (!cartons.length || cartons.some(carton => carton.status !== 'active')) {
        throw new ConflictException('All cartons require active jobs');
      }
      const { rows: [saved] } = execute
        ? await client.query(`
          UPDATE public.shipment_manifests SET dispatched_by = $2, dispatched_at = now(), gate_pass = gen_random_uuid()
          WHERE id = $1 RETURNING *`, [id, user.id])
        : await client.query(`
          UPDATE public.shipment_manifests SET approved_by = $2, approved_at = now() WHERE id = $1 RETURNING *`, [id, user.id]);
      if (execute) {
        // Write one dispatch record per carton so the existing job-closing reconciliation remains authoritative.
        await client.query(`
          INSERT INTO public.carton_dispatch (carton_id, approved_by, approved_at, dispatched_by, dispatched_at, gate_pass)
          SELECT mc.carton_id, $2, $3, $4, $5, gen_random_uuid()
          FROM public.shipment_manifest_cartons mc WHERE mc.manifest_id = $1`,
          [id, manifest.approved_by, manifest.approved_at, user.id, saved.dispatched_at]);
      }
      await this.log(client, user, manifest.factory_id, id, execute ? 'SHIPMENT_DISPATCHED' : 'SHIPMENT_APPROVED',
        { cartons: cartons.length });
      return saved;
    });
  }

  async gatePassDocument(user: AuthenticatedUser, id: string) {
    const { rows: [manifest] } = await this.db.query<{
      id: string;
      factoryName: string;
      carrier: string;
      vehicle: string;
      seal: string;
      destination: string;
      gatePass: string | null;
      dispatchedAt: string | null;
      approvedAt: string | null;
    }>(`
      SELECT m.id, f.name AS "factoryName", m.carrier, m.vehicle, m.seal, m.destination,
             m.gate_pass AS "gatePass", m.dispatched_at::text AS "dispatchedAt", m.approved_at::text AS "approvedAt"
      FROM public.shipment_manifests m
      JOIN public.factories f ON f.id = m.factory_id
      WHERE ${factoryScope} AND m.id = $4`, [...jobScopeParams(user), id]);
    if (!manifest) throw new NotFoundException('Shipment not found in assigned factory');
    if (!manifest.gatePass || !manifest.dispatchedAt) {
      throw new ConflictException('Gate pass is only generated after shipment dispatch execution');
    }

    const { rows: cartons } = await this.db.query<{
      barcode: string;
      jobCode: string;
      size: string;
      color: string;
      quantity: number;
    }>(`
      SELECT c.barcode, j.job_code AS "jobCode", b.size, b.color, c.quantity
      FROM public.shipment_manifest_cartons mc
      JOIN public.bundle_cartons c ON c.id = mc.carton_id
      JOIN public.bundles b ON b.id = c.bundle_id
      JOIN public.jobs j ON j.id = b.job_id
      WHERE mc.manifest_id = $1
      ORDER BY c.barcode ASC`, [id]);

    const totalQty = cartons.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gate Pass</title>',
      '<style>body{font-family:sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ccc;padding:8px;text-align:left;}</style>',
      '</head><body>',
      `<h1>STITCHFLOW GATE PASS</h1>`,
      `<p><strong>Gate Pass ID:</strong> ${esc(manifest.gatePass)}</p>`,
      `<p><strong>Factory:</strong> ${esc(manifest.factoryName)} | <strong>Dispatched:</strong> ${esc(manifest.dispatchedAt)}</p>`,
      `<p><strong>Carrier:</strong> ${esc(manifest.carrier)} | <strong>Vehicle:</strong> ${esc(manifest.vehicle)} | <strong>Seal:</strong> ${esc(manifest.seal)}</p>`,
      `<p><strong>Destination:</strong> ${esc(manifest.destination)} | <strong>Total Cartons:</strong> ${cartons.length} | <strong>Total Pieces:</strong> ${totalQty}</p>`,
      '<table><thead><tr><th>Carton</th><th>Job</th><th>Size</th><th>Color</th><th>Qty</th></tr></thead><tbody>',
      ...cartons.map(c => `<tr><td>${esc(c.barcode)}</td><td>${esc(c.jobCode)}</td><td>${esc(c.size)}</td><td>${esc(c.color)}</td><td>${c.quantity}</td></tr>`),
      '</tbody></table></body></html>',
    ].join('');

    const text = [
      `STITCHFLOW GATE PASS: ${manifest.gatePass}`,
      `Factory: ${manifest.factoryName}`,
      `Dispatched: ${manifest.dispatchedAt}`,
      `Carrier: ${manifest.carrier} | Vehicle: ${manifest.vehicle} | Seal: ${manifest.seal}`,
      `Destination: ${manifest.destination}`,
      `Cartons: ${cartons.length} | Total Qty: ${totalQty}`,
      ...cartons.map(c => `- ${c.barcode} (${c.jobCode} ${c.size}/${c.color}: ${c.quantity})`),
    ].join('\n');

    return { manifest, cartons, totalQty, html, text };
  }

  private role(user: AuthenticatedUser, role: 'factory-manager' | 'store-dispatch') {
    if (user.role !== role) throw new ForbiddenException('This employee role cannot perform this shipment action');
  }

  private log(client: PoolClient, user: AuthenticatedUser, factoryId: string, id: string, action: string, newValues: object) {
    return this.audit.record({
      organizationId: user.organizationId, factoryId, actorId: user.id, actorEmployeeId: user.employeeId,
      actorName: user.name, actorRole: user.role, action, entityType: 'shipment_manifest', entityId: id,
      newValues: { ...newValues },
    }, client);
  }
}

@ApiTags('Shipment manifests')
@ApiBearerAuth()
@Controller('dispatch/manifests')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get()
  @RequirePermissions('CAN_MONITOR_DISPATCH')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) { return this.shipments.list(user, query); }

  @Post()
  @RequirePermissions('CAN_EXECUTE_DISPATCH')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: ShipmentInput) { return this.shipments.create(user, body); }

  @Get(':id/gate-pass')
  @RequirePermissions('CAN_MONITOR_DISPATCH')
  gatePass(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.gatePassDocument(user, id);
  }

  @Get(':id/gate-pass.pdf')
  @RequirePermissions('CAN_MONITOR_DISPATCH')
  @Header('Content-Type', 'application/pdf')
  async gatePassPdf(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const doc = await this.shipments.gatePassDocument(user, id);
    const pdf = buildPdfBuffer(`STITCHFLOW GATE PASS: ${doc.manifest.gatePass}`, doc.text.split('\n'));
    return new StreamableFile(pdf, { disposition: `attachment; filename="gate-pass-${id}.pdf"` });
  }

  @Post(':id/approve')
  @RequirePermissions('CAN_APPROVE_DISPATCH')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.transition(user, id, false);
  }

  @Post(':id/execute')
  @RequirePermissions('CAN_EXECUTE_DISPATCH')
  execute(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.transition(user, id, true);
  }
}

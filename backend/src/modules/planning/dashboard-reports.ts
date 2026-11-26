import { BadRequestException, Controller, Get, Header, Injectable, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { buildExcelXml, buildPdfBuffer } from '../../common/utilities/document-export';
import { DatabaseService } from '../../database/database.service';
import { JobListQuery } from '../jobs/jobs.dto';
import { factoryScope, jobReadScope, jobScopeParams } from '../jobs/jobs.service';

class ReportQuery extends JobListQuery {
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetTo?: string;
}

const scopedJobRows = `
  SELECT j.id, j.job_code, j.factory_id, f.name AS factory_name, j.status,
    j.order_quantity, j.target_date::text, j.line_id
  FROM public.jobs j JOIN public.factories f ON f.id = j.factory_id
  WHERE ${jobReadScope} AND ($4::uuid IS NULL OR j.factory_id = $4)
    AND ($6::date IS NULL OR j.target_date >= $6) AND ($7::date IS NULL OR j.target_date <= $7)
    AND (
      $8::text NOT IN ('qc-inspector','packing-staff')
      OR EXISTS (
        SELECT 1 FROM public.job_quality_assignments w JOIN public.user_assignments a ON a.id = w.assignment_id
        WHERE w.job_id = j.id AND a.profile_id = $3 AND a.is_active AND a.factory_id = j.factory_id
          AND w.duty = CASE WHEN $8 = 'packing-staff' THEN 'packing' ELSE 'qc' END
      )
    )`;

const dashboardMetrics = `
  SELECT j.*, COALESCE(cutting.quantity, 0)::integer AS cut,
    COALESCE(quality.inspected,0)::integer AS inspected, COALESCE(quality.rework,0)::integer AS rework,
    COALESCE(quality.rejected,0)::integer AS rejected, COALESCE(quality.released,0)::integer AS released,
    COALESCE(shipping.packed,0)::integer AS packed, COALESCE(shipping.dispatched,0)::integer AS dispatched
  FROM scoped j
  LEFT JOIN LATERAL (
    SELECT SUM(e.quantity) AS quantity FROM public.cutting_output_events e
    JOIN public.bundles b ON b.id = e.bundle_id WHERE b.job_id = j.id
  ) cutting ON true
  LEFT JOIN LATERAL (
    SELECT SUM(q.inspected) AS inspected, SUM(q.rework) AS rework, SUM(q.rejected) AS rejected, SUM(q.released) AS released
    FROM public.bundle_quality_balances q JOIN public.bundles b ON b.id = q.bundle_id WHERE b.job_id = j.id
  ) quality ON true
  LEFT JOIN LATERAL (
    SELECT SUM(c.quantity) AS packed, SUM(c.quantity) FILTER (WHERE d.dispatched_at IS NOT NULL) AS dispatched
    FROM public.bundle_cartons c JOIN public.bundles b ON b.id = c.bundle_id
    LEFT JOIN public.carton_dispatch d ON d.carton_id = c.id WHERE b.job_id = j.id
  ) shipping ON true`;

export function csvCell(value: unknown) {
  if (value === null || value === undefined) return '""';
  const raw = String(value);
  const safe = typeof value === 'string' && /^(?:\s*[=+\-@]|[\t\r\n])/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async jobs(user: AuthenticatedUser, query: ReportQuery) {
    const { rows } = await this.db.query(`
      WITH scoped AS (${scopedJobRows} AND ($5::uuid IS NULL OR j.id > $5) ORDER BY j.id LIMIT 100)
      ${dashboardMetrics} ORDER BY j.id`, this.params(user, query));
    return rows;
  }

  async summary(user: AuthenticatedUser, query: ReportQuery) {
    const { rows: [summary] } = await this.db.query(`
      WITH scoped AS (${scopedJobRows} AND ($5::uuid IS NULL OR j.id > $5)), metrics AS (${dashboardMetrics}),
      accessible_factories AS (
        SELECT f.id FROM public.factories f WHERE ${factoryScope} AND ($4::uuid IS NULL OR f.id = $4)
      )
      SELECT COUNT(*) FILTER (WHERE status <> 'cancelled') AS jobs,
        COUNT(*) FILTER (WHERE status = 'active') AS "activeJobs",
        COUNT(*) FILTER (WHERE status = 'draft') AS drafts,
        COUNT(*) FILTER (WHERE status IN ('active','on-hold') AND target_date::date < CURRENT_DATE) AS "pastTarget",
        COALESCE(SUM(order_quantity) FILTER (WHERE status <> 'cancelled'),0) AS ordered,
        COALESCE(SUM(cut),0) AS cut, COALESCE(SUM(inspected),0) AS inspected,
        COALESCE(SUM(rework),0) AS rework, COALESCE(SUM(rejected),0) AS rejected,
        COALESCE(SUM(released),0) AS released, COALESCE(SUM(packed),0) AS packed,
        COALESCE(SUM(dispatched),0) AS dispatched,
        (SELECT COUNT(*) FROM public.shipment_manifests m JOIN accessible_factories f ON f.id = m.factory_id
          WHERE m.dispatched_at IS NULL AND $8 IN ('md','factory-manager','store-dispatch')) AS "pendingShipments",
        (SELECT COUNT(DISTINCT t.id) FROM public.raw_material_transfers t
          JOIN public.storage_locations l ON l.id = t.destination_location_id JOIN accessible_factories f ON f.id = l.factory_id
          WHERE t.received_at IS NULL AND NOT EXISTS (
            SELECT 1 FROM public.raw_transfer_discrepancies d WHERE d.transfer_id = t.id AND d.returned_at IS NOT NULL
          ) AND $8 IN ('md','factory-manager','store-dispatch')) AS "incomingTransfers"
      FROM metrics`, this.params(user, { ...query, after: undefined }));
    return Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Number(value)]));
  }

  async export(user: AuthenticatedUser, query: ReportQuery) {
    const jobs = await this.jobs(user, query);
    const headings = ['job_code','factory_name','status','target_date','order_quantity','cut','inspected','rework','rejected','released','packed','dispatched'];
    const csv = [headings.map(csvCell).join(','), ...jobs.map(row => headings.map(key => csvCell(row[key])).join(','))].join('\r\n');
    return { csv, nextCursor: jobs.length === 100 ? jobs[jobs.length - 1].id : null };
  }

  private params(user: AuthenticatedUser, query: ReportQuery) {
    if (query.targetFrom && query.targetTo && query.targetFrom > query.targetTo) {
      throw new BadRequestException('Target date range is reversed');
    }
    return [...jobScopeParams(user), query.factoryId ?? null, query.after ?? null, query.targetFrom ?? null, query.targetTo ?? null, user.role];
  }
}

@ApiTags('Dashboards and reports')
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('analytics/dashboard')
  dashboardSummary(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQuery) { return this.dashboard.summary(user, query); }

  @Get('reports/jobs')
  jobs(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQuery) { return this.dashboard.jobs(user, query); }

  @Get('reports/jobs/export')
  export(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQuery) { return this.dashboard.export(user, query); }

  @Get('reports/jobs.pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQuery) {
    const jobs = await this.dashboard.jobs(user, query);
    const lines = jobs.map(j => `${j.jobCode} | ${j.factoryName} | ${j.status} | Order ${j.orderQuantity} | Cut ${j.cuttingQty} | Packed ${j.packedQty} | Dispatched ${j.dispatchedQty}`);
    const pdf = buildPdfBuffer('StitchFlow Jobs Production Report', lines.length ? lines : ['No jobs found for filter']);
    return new StreamableFile(pdf, { disposition: 'attachment; filename="stitchflow-jobs-report.pdf"' });
  }

  @Get('reports/jobs.xls')
  @Header('Content-Type', 'application/vnd.ms-excel')
  async exportExcel(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQuery) {
    const jobs = await this.dashboard.jobs(user, query);
    const xml = buildExcelXml(
      'Jobs Report',
      ['Job Code', 'Factory', 'Status', 'Order Qty', 'Cutting Qty', 'Packed Qty', 'Dispatched Qty', 'Target Date'],
      jobs.map(j => [j.jobCode, j.factoryName, j.status, j.orderQuantity, j.cuttingQty, j.packedQty, j.dispatchedQty, j.targetDate]),
    );
    return new StreamableFile(Buffer.from(xml, 'utf8'), { disposition: 'attachment; filename="stitchflow-jobs-report.xls"' });
  }
}

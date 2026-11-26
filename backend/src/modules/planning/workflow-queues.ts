import { Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { jobReadScope, jobScopeParams } from '../jobs/jobs.service';

export interface QueueSample {
  key: string;
  ordinal: number;
  pending: string;
  completed_7d: string;
}

const observationDays = 7;

export function summarizeQueues(rows: QueueSample[]) {
  return rows.map(row => {
    const pending = Number(row.pending);
    const completedInWindow = Number(row.completed_7d);
    return {
      stage: row.key,
      ordinal: row.ordinal,
      pending,
      completedInWindow,
      completedPerCalendarDay: completedInWindow / observationDays,
      estimatedQueueDays: pending === 0 ? 0 : completedInWindow > 0 ? pending * observationDays / completedInWindow : null,
      hasThroughputEvidence: completedInWindow > 0,
    };
  }).sort((a, b) => {
    if (!a.pending || !b.pending) return b.pending - a.pending || a.ordinal - b.ordinal;
    if (a.estimatedQueueDays === null || b.estimatedQueueDays === null) {
      if (a.estimatedQueueDays === b.estimatedQueueDays) return b.pending - a.pending || a.ordinal - b.ordinal;
      return a.estimatedQueueDays === null ? -1 : 1;
    }
    return b.estimatedQueueDays - a.estimatedQueueDays || a.ordinal - b.ordinal;
  });
}

@Injectable()
export class WorkflowQueuesService {
  constructor(private readonly db: DatabaseService) {}

  async report(user: AuthenticatedUser, id: string) {
    // One statement keeps authorization, queue balances and rolling counts on the same snapshot.
    const { rows: [report] } = await this.db.query<{ job_code: string; target_date: string; queues: QueueSample[] }>(`
      WITH scoped AS (
        SELECT j.id, j.job_code, j.target_date FROM public.jobs j
        JOIN public.factories f ON f.id = j.factory_id WHERE ${jobReadScope} AND j.id = $4
      ), bundle_base AS (
        SELECT b.id, b.job_id, b.quantity,
          NOT EXISTS (
            SELECT 1 FROM public.job_route_steps s WHERE s.job_id = b.job_id AND NOT EXISTS (
              SELECT 1 FROM public.bundle_route_progress e WHERE e.bundle_id = b.id AND e.step_id = s.id AND e.completed_at IS NOT NULL
            )
          ) AND EXISTS (SELECT 1 FROM public.job_route_steps s WHERE s.job_id = b.job_id) AS route_complete,
          COALESCE(q.inspected, 0) AS inspected, COALESCE(q.rework, 0) AS rework,
          COALESCE(q.reworked, 0) AS reworked, COALESCE(q.held, 0) AS held,
          COALESCE(q.released, 0) AS released
        FROM public.bundles b JOIN scoped j ON j.id = b.job_id
        LEFT JOIN public.bundle_quality_balances q ON q.bundle_id = b.id
      ), data AS (
        SELECT s.stage_code AS key, s.ordinal,
          COALESCE(SUM(p.available), 0)::text AS pending,
          (SELECT COALESCE(SUM(done.quantity), 0)::text FROM public.bundle_stage_events done
            WHERE done.step_id = s.id AND done.created_at >= now() - interval '7 days') AS completed_7d
        FROM scoped j JOIN public.job_route_steps s ON s.job_id = j.id
        LEFT JOIN public.bundle_route_progress p ON p.step_id = s.id
        GROUP BY s.id, s.stage_code, s.ordinal
        UNION ALL
        SELECT 'quality', 100,
          COALESCE(SUM(b.quantity - b.inspected + b.reworked + b.held) FILTER (WHERE b.route_complete), 0)::text,
          (SELECT COALESCE(SUM((e.payload->>'passed')::integer + (e.payload->>'rejected')::integer
              + (e.payload->>'rework')::integer + (e.payload->>'held')::integer), 0)::text
            FROM public.bundle_quality_events e JOIN bundle_base bb ON bb.id = e.bundle_id
            WHERE e.action IN ('inspection','reinspection') AND e.created_at >= now() - interval '7 days')
        FROM bundle_base b
        UNION ALL
        SELECT 'rework', 101, COALESCE(SUM(b.rework - b.reworked), 0)::text,
          (SELECT COALESCE(SUM((e.payload->>'quantity')::integer), 0)::text
            FROM public.bundle_quality_events e JOIN bundle_base bb ON bb.id = e.bundle_id
            WHERE e.action = 'rework' AND e.created_at >= now() - interval '7 days')
        FROM bundle_base b
        UNION ALL
        SELECT 'packing', 102, (COALESCE(SUM(b.released), 0) - (
          SELECT COALESCE(SUM(c.quantity), 0) FROM public.bundle_cartons c JOIN bundle_base bb ON bb.id = c.bundle_id
        ))::text,
          (SELECT COALESCE(SUM(c.quantity), 0)::text FROM public.bundle_cartons c JOIN bundle_base bb ON bb.id = c.bundle_id
            WHERE c.created_at >= now() - interval '7 days')
        FROM bundle_base b
      )
      SELECT j.job_code, j.target_date::text, (SELECT jsonb_agg(to_jsonb(d)) FROM data d) AS queues
      FROM scoped j`, [...jobScopeParams(user), id]);
    if (!report) throw new NotFoundException('Job not found');
    const queues = summarizeQueues(report.queues);
    return {
      jobId: id, jobCode: report.job_code, targetDate: report.target_date, observationDays,
      queues, largestMeasuredWait: queues.find(queue => queue.pending > 0 && queue.hasThroughputEvidence) ?? null,
      queuesWithoutThroughput: queues.filter(queue => queue.pending > 0 && !queue.hasThroughputEvidence),
    };
  }
}

@ApiTags('Production intelligence')
@ApiBearerAuth()
@Controller('analytics/jobs')
export class WorkflowQueuesController {
  constructor(private readonly queues: WorkflowQueuesService) {}

  @Get(':id/queues')
  @RequirePermissions('CAN_VIEW_EXECUTIVE_REPORTS')
  report(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.queues.report(user, id);
  }
}

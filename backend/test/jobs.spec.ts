import { ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/types/auth-user.type';
import { DatabaseService } from '../src/database/database.service';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { JobWorkflowService } from '../src/modules/jobs/job-workflow.service';
import { AuditService } from '../src/modules/audit/audit.service';

const factoryId = 'a59436d3-76f9-460a-852f-d8d97687b9f2';
const jobId = 'c34bbf44-8133-43fd-ada7-a9438689367e';
const actor: AuthenticatedUser = {
  id: '20eb3e96-e8de-44e5-91e0-5e54cc8ce5dc',
  organizationId: 'fbc76437-df75-41b9-84e7-05660966f660',
  role: 'factory-manager',
  permissions: ['CAN_MANAGE_JOBS'],
  assignedFactoryIds: [factoryId],
  accountStatus: 'active',
  employeeId: 'EMP-10',
  name: 'Test Manager',
  email: 'test@example.test',
};

function setup(status: string) {
  const query = jest.fn().mockResolvedValueOnce({ rows: [{ id: jobId, factoryId, status }] });
  const db = { withTransaction: jest.fn(async callback => callback({ query })) };
  return { query, service: new JobsService(db as unknown as DatabaseService) };
}

describe('Job status transaction', () => {
  it('locks a scoped held job and records resumption alongside the write', async () => {
    const { query, service } = setup('on-hold');
    await expect(service.changeStatus(actor, jobId, 'active')).resolves.toMatchObject({ status: 'active' });
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE OF j');
    expect(query.mock.calls[0][1]).toEqual([actor.organizationId, false, actor.id, jobId]);
    expect(query.mock.calls[1][1]).toEqual([jobId, 'active']);
    expect(query.mock.calls[2][1]).toContain('JOB_STATUS_CHANGED');
  });

  it('treats repeating an activation as a no-op', async () => {
    const { query, service } = setup('active');
    await expect(service.changeStatus(actor, jobId, 'active')).resolves.toMatchObject({ status: 'active' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('prevents transitions from a closed job', async () => {
    const { query, service } = setup('closed');
    await expect(service.changeStatus(actor, jobId, 'active')).rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

function workflowSetup() {
  const query = jest.fn().mockResolvedValueOnce({
    rows: [{ id: jobId, factory_id: factoryId, status: 'active', sizes: ['M'], colors: ['Blue'], order_quantity: 100 }],
  });
  const client = { query };
  const db = { withTransaction: jest.fn(async callback => callback(client)) };
  const record = jest.fn();
  const workflow = new JobWorkflowService(db as unknown as DatabaseService, { record } as unknown as AuditService);
  return { query, workflow, client, record };
}

describe('Approval and bundle allocation', () => {
  const request = { requestId: '6bd8cc11-ec7b-4f73-84a0-44a58f4fd242', size: 'M', color: 'Blue', quantity: 20 };

  it('blocks the generic status route from activating a draft', async () => {
    const { query, service } = setup('draft');
    await expect(service.changeStatus(actor, jobId, 'active')).rejects.toThrow(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('records the approval and activation in the job transaction', async () => {
    const { query, workflow, client, record } = workflowSetup();
    query.mockReset()
      .mockResolvedValueOnce({ rows: [{ id: jobId, factory_id: factoryId, status: 'draft' }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(workflow.decide(actor, jobId, { decision: 'approved' }))
      .resolves.toMatchObject({ status: 'active' });
    expect(query.mock.calls[2][0]).toContain('INSERT INTO public.job_approvals');
    expect(query.mock.calls[3][1]).toEqual([jobId, 'active']);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'JOB_APPROVAL_DECIDED' }), client);
  });

  it('rejects bundle quantities above the remainder while the job is locked', async () => {
    const { query, workflow, record } = workflowSetup();
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ total: '90' }] });
    await expect(workflow.generate(actor, jobId, request)).rejects.toThrow(ConflictException);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE OF j');
    expect(query).toHaveBeenCalledTimes(3);
    expect(record).not.toHaveBeenCalled();
  });

  it('returns the original bundle on retry without allocating quantity again', async () => {
    const { query, workflow, record } = workflowSetup();
    const prior = { id: 'bundle-1', bundleCode: 'BND-1', size: 'M', color: 'Blue', quantity: 20 };
    query.mockResolvedValueOnce({ rows: [prior] });
    await expect(workflow.generate(actor, jobId, request)).resolves.toEqual(prior);
    expect(query).toHaveBeenCalledTimes(2);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('Variant-based bundle allocation', () => {
  it('enforces a configured size/color quantity even when the overall job has capacity', async () => {
    const { query, workflow, record } = workflowSetup();
    query.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '20', has_items: true, variant_total: '10', variant_limit: 15 }] });
    await expect(workflow.generate(actor, jobId, {
      requestId: '6bd8cc11-ec7b-4f73-84a0-44a58f4fd242', size: 'M', color: 'Blue', quantity: 6,
    })).rejects.toThrow(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });
});

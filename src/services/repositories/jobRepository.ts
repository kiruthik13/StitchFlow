import { Job, JobStatus } from '../../core/types';
import { ApiError, apiRequest } from '../api/apiClient';
import { JOBS } from '../../fixtures/mockData';

export interface IJobRepository {
  getJobs(): Promise<Job[]>;
  getJobById(id: string): Promise<Job | null>;
  createJob(job: Omit<Job, 'id'>): Promise<Job>;
  updateJobStatus(id: string, status: JobStatus): Promise<Job>;
}

export class MockJobRepository implements IJobRepository {
  private jobs: Job[] = [...JOBS];

  async getJobs(): Promise<Job[]> {
    return Promise.resolve([...this.jobs]);
  }

  async getJobById(id: string): Promise<Job | null> {
    const job = this.jobs.find((j) => j.id === id) ?? null;
    return Promise.resolve(job);
  }

  async createJob(jobData: Omit<Job, 'id'>): Promise<Job> {
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
    };
    this.jobs.unshift(newJob);
    return Promise.resolve(newJob);
  }

  async updateJobStatus(id: string, status: JobStatus): Promise<Job> {
    const idx = this.jobs.findIndex((j) => j.id === id);
    if (idx === -1) {
      throw new Error(`Job with id ${id} not found.`);
    }
    this.jobs[idx] = { ...this.jobs[idx], status };
    return Promise.resolve(this.jobs[idx]);
  }
}

export class ApiJobRepository implements IJobRepository {
  async getJobPage(after?: string): Promise<Job[]> {
    return apiRequest<Job[]>(after ? `/jobs?after=${encodeURIComponent(after)}` : '/jobs');
  }

  async getJobs(): Promise<Job[]> {
    const jobs: Job[] = [];
    let page = await this.getJobPage();
    while (page.length) {
      jobs.push(...page);
      if (page.length < 100) break;
      page = await this.getJobPage(page[page.length - 1].id);
    }
    return jobs;
  }

  async getJobById(id: string): Promise<Job | null> {
    try {
      return await apiRequest<Job>(`/jobs/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async createJob(job: Omit<Job, 'id'>): Promise<Job> {
    const { factoryId, buyerId, styleId, lineId, jobCode, orderQuantity, startDate, targetDate, colors, sizes } = job;
    return apiRequest<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ factoryId, buyerId, styleId, lineId, jobCode, orderQuantity, startDate, targetDate, colors, sizes }),
    });
  }

  async updateJobStatus(id: string, status: JobStatus): Promise<Job> {
    if (status !== 'active' && status !== 'on-hold' && status !== 'cancelled') {
      throw new ApiError(400, 'ERR_UNSUPPORTED_JOB_STATUS', 'Unsupported job status');
    }
    return apiRequest<Job>(`/jobs/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }
}

export const apiJobs = new ApiJobRepository();
export const jobRepository: IJobRepository = process.env.EXPO_PUBLIC_DEMO_MODE === 'true'
  ? new MockJobRepository() : apiJobs;

import { Job, JobStatus } from '../../core/types';
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

export const jobRepository = new MockJobRepository();

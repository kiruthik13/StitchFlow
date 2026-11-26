import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { loadEnv } from '../config/env.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private supabaseAdmin: SupabaseClient | null = null;

  onModuleInit() {
    const env = loadEnv();

    if (env.databaseUrl) {
      const useSsl = env.databaseUrl.includes('supabase.co') || env.databaseUrl.includes('sslmode=require');
      this.pool = new Pool({
        connectionString: env.databaseUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      this.pool.on('error', (err) => {
        this.logger.error(`PostgreSQL pool error: ${err.message}`);
      });
    } else {
      this.logger.warn('DATABASE_URL not configured — PostgreSQL pool disabled until configured.');
    }

    if (env.supabaseUrl && env.supabaseServiceRoleKey) {
      this.supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else {
      this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Supabase admin client disabled.');
    }

  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  getSupabaseAdmin(): SupabaseClient {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase admin client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return this.supabaseAdmin;
  }

  getSupabasePublic(): SupabaseClient {
    const { supabaseUrl, supabaseAnonKey } = loadEnv();
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase public client is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  isDatabaseConfigured(): boolean {
    return this.pool !== null;
  }

  async checkHealth(): Promise<{ status: 'up' | 'unconfigured' | 'down' }> {
    if (!this.pool) return { status: 'unconfigured' };
    try {
      await this.pool.query('SELECT 1');
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('PostgreSQL database is not configured. Set DATABASE_URL in backend/.env.');
    }
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('PostgreSQL database is not configured. Set DATABASE_URL in backend/.env.');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

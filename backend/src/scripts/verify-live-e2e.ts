import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { Client } from 'pg';

async function checkPostgres(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing');
  const useSsl = databaseUrl.includes('supabase.') || databaseUrl.includes('sslmode=require');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query('SELECT 1');
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const expected = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM public.stitchflow_schema_migrations',
    );
    const applied = new Set(rows.map((r) => r.filename));
    const missing = expected.filter((f) => !applied.has(f));
    if (missing.length > 0) {
      throw new Error(`Missing applied migrations: ${missing.join(', ')}`);
    }
    console.log(`PostgreSQL OK (${expected.length} migrations verified)`);
  } finally {
    await client.end();
  }
}

async function checkRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL is missing');
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  await redis.connect();
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error(`Unexpected Redis PING response: ${pong}`);
    console.log('Redis OK (PING -> PONG)');
  } finally {
    await redis.quit();
  }
}

async function checkSupabaseAuth(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(`Supabase Auth check failed: ${error.message}`);
  console.log('Supabase Auth Admin OK');
}

async function main() {
  await checkPostgres();
  await checkRedis();
  await checkSupabaseAuth();
  console.log('All live infrastructure checks passed.');
}

main().catch((err) => {
  console.error('Live E2E verification failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

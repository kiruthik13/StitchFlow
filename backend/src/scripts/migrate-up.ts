import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required to run migrations');
  }

  const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const useSsl = databaseUrl.includes('supabase.') || databaseUrl.includes('sslmode=require');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.stitchflow_schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM public.stitchflow_schema_migrations',
    );
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`SKIP ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`APPLY ${file}...`);
      await client.query(sql);
      await client.query(
        'INSERT INTO public.stitchflow_schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [file],
      );
      console.log(`OK ${file}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

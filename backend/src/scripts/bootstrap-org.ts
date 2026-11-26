import 'reflect-metadata';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

/**
 * One-time CLI bootstrap for initial Organization, Factory, and Authorized MD Administrator.
 * Never exposed as an HTTP endpoint and contains zero hardcoded passwords.
 *
 * Usage:
 *   BOOTSTRAP_ORG_CODE=ORG-01 BOOTSTRAP_ORG_NAME="My Apparel Group" \
 *   BOOTSTRAP_FACTORY_CODE=FAC-01 BOOTSTRAP_FACTORY_NAME="Unit 1" \
 *   BOOTSTRAP_FACTORY_LOCATION="Tirupur" BOOTSTRAP_ADMIN_EMAIL=md@company.com \
 *   BOOTSTRAP_ADMIN_PASSWORD=... BOOTSTRAP_ADMIN_EMPLOYEE_ID=EMP-001 \
 *   BOOTSTRAP_ADMIN_NAME="Managing Director" npx ts-node src/scripts/bootstrap-org.ts
 */
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  const orgCode = process.env.BOOTSTRAP_ORG_CODE;
  const orgName = process.env.BOOTSTRAP_ORG_NAME;
  const factoryCode = process.env.BOOTSTRAP_FACTORY_CODE;
  const factoryName = process.env.BOOTSTRAP_FACTORY_NAME;
  const factoryLocation = process.env.BOOTSTRAP_FACTORY_LOCATION || 'Primary Plant';
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const adminEmpId = process.env.BOOTSTRAP_ADMIN_EMPLOYEE_ID;
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME;

  if (
    !supabaseUrl ||
    !serviceKey ||
    !databaseUrl ||
    !orgCode ||
    !orgName ||
    !factoryCode ||
    !factoryName ||
    !adminEmail ||
    !adminPassword ||
    !adminEmpId ||
    !adminName
  ) {
    throw new Error('Missing required SUPABASE_* / DATABASE_URL / BOOTSTRAP_* environment variables.');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingOrg = await client.query<{ id: string }>(
      `SELECT id FROM public.organizations WHERE code = $1 LIMIT 1`,
      [orgCode],
    );
    if (existingOrg.rows.length > 0) {
      throw new Error(`Organization with code "${orgCode}" already exists. Duplicate bootstrap aborted.`);
    }

    const orgRes = await client.query<{ id: string }>(
      `INSERT INTO public.organizations (code, name)
       VALUES ($1, $2)
       RETURNING id`,
      [orgCode, orgName],
    );
    const orgId = orgRes.rows[0].id;

    const facRes = await client.query<{ id: string }>(
      `INSERT INTO public.factories (organization_id, code, name, location)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [orgId, factoryCode, factoryName, factoryLocation],
    );
    const factoryId = facRes.rows[0].id;

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: adminName, employeeId: adminEmpId },
    });

    if (error || !created.user) {
      throw new Error(error?.message || 'Failed to create initial administrator in Supabase Auth');
    }

    await client.query(
      `INSERT INTO public.profiles (
        id, organization_id, employee_id, name, email, role_code, account_status, approved_at
      ) VALUES ($1, $2, $3, $4, $5, 'md', 'active', NOW())`,
      [created.user.id, orgId, adminEmpId, adminName, adminEmail.toLowerCase()],
    );

    await client.query(
      `INSERT INTO public.user_assignments (profile_id, factory_id, is_primary, is_active)
       VALUES ($1, $2, TRUE, TRUE)`,
      [created.user.id, factoryId],
    );

    await client.query(
      `INSERT INTO public.audit_logs (
        organization_id, factory_id, actor_id, actor_employee_id, actor_name, actor_role,
        action, entity_type, entity_id, result
      ) VALUES ($1, $2, $3, $4, $5, 'md', 'ORG_BOOTSTRAP', 'organization', $1, 'success')`,
      [orgId, factoryId, created.user.id, adminEmpId, adminName],
    );

    await client.query('COMMIT');
    console.log(`Bootstrap complete for organization ${orgCode} and factory ${factoryCode}.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});

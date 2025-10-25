import fs from 'fs/promises';
import { Client } from 'pg';
import path from 'path';

const MIGRATION_PATH = path.resolve('supabase/migrations/20251025074310_c21e0445-8856-4c4f-9c6b-7e2b81509220.sql');

const client = new Client({
  user: 'postgres.mcvohdpjzihslxkpajqd',
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  database: 'postgres',
  password: 'Abuturab@3110',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
    console.log('Loaded migration SQL (length:', sql.length, 'chars)');

    await client.connect();
    console.log('Connected to DB; running migration...');

    // Execute the full migration SQL; split by \n; but better to run whole script
    await client.query(sql);
    console.log('Migration SQL executed.');

    // List public tables
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
    console.log('Public tables:');
    for (const row of res.rows) console.log(' -', row.table_name);

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

await run();

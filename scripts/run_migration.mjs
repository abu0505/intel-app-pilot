import fs from 'fs/promises';
import { Client } from 'pg';
import path from 'path';

const MIGRATION_PATH = path.resolve('supabase/migrations/20251024172058_8260512f-f070-49dc-a309-30f0b281beab.sql');

const client = new Client({
  user: 'postgres',
  host: 'db.dshdcbcagsbwixxlkgmc.supabase.co',
  database: 'postgres',
  password: 'Abuturab@3110',
  port: 5432,
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

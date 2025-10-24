import { Client } from 'pg';

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
    await client.connect();
    console.log('Connected; listing user-defined tables (excluding pg_catalog and information_schema):');
    const res = await client.query("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename;");
    if (res.rows.length === 0) {
      console.log('No tables found (query returned 0 rows).');
    } else {
      for (const r of res.rows) console.log(` - ${r.schemaname}.${r.tablename}`);
    }

    // Also list extensions
    const ex = await client.query("SELECT name, default_version, installed_version FROM pg_available_extensions WHERE installed_version IS NOT NULL ORDER BY name;");
    console.log('\nInstalled extensions:');
    if (ex.rows.length === 0) console.log(' (none)');
    else ex.rows.forEach(e => console.log(' -', e.name, e.installed_version));

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error listing tables:', err.message || err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

await run();

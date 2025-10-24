import { Client } from 'pg';

// DB connection config
const client = new Client({
  user: 'postgres',
  host: 'db.dshdcbcagsbwixxlkgmc.supabase.co',
  database: 'postgres',
  password: 'Abuturab@3110', // kept only here, not printed
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  const res = await client.query('SELECT now() as now');
  console.log('Connection successful — server time:', res.rows[0].now);
  await client.end();
  process.exit(0);
} catch (err) {
  console.error('Connection failed:', err.message);
  try { await client.end(); } catch (e) {}
  process.exit(1);
}

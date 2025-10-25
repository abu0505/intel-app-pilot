import fs from 'fs/promises';
import { Client } from 'pg';
import path from 'path';

// Your Supabase database connection
const client = new Client({
  connectionString: 'postgresql://postgres.mcvohdpjzihslxkpajqd:Abuturab@3110@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const MIGRATION_PATH = path.resolve('scripts/complete_schema.sql');

async function runMigration() {
  try {
    console.log('🔄 Connecting to your Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('📖 Reading migration file...');
    const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
    console.log(`📝 Loaded migration SQL (${sql.length} characters)`);

    console.log('🚀 Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    // Verify tables were created
    console.log('\n📊 Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n✅ Created tables:');
    for (const row of tablesResult.rows) {
      console.log(`   ✓ ${row.table_name}`);
    }

    // Check RLS policies
    console.log('\n🔒 Checking RLS policies...');
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    console.log(`\n✅ Created ${policiesResult.rows.length} RLS policies`);
    
    const policiesByTable = {};
    for (const row of policiesResult.rows) {
      if (!policiesByTable[row.tablename]) {
        policiesByTable[row.tablename] = [];
      }
      policiesByTable[row.tablename].push(row.policyname);
    }

    for (const [table, policies] of Object.entries(policiesByTable)) {
      console.log(`   📋 ${table}: ${policies.length} policies`);
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('   2. Navigate to Settings → API');
    console.log('   3. Copy your "anon" key and "service_role" key');
    console.log('   4. Update your local .env file with:');
    console.log('      VITE_SUPABASE_URL=https://mcvohdpjzihslxkpajqd.supabase.co');
    console.log('      VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>');
    console.log('      VITE_SUPABASE_PROJECT_ID=mcvohdpjzihslxkpajqd');
    console.log('   5. For edge functions, also set in Supabase dashboard:');
    console.log('      SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
    console.log('      GOOGLE_AI_API_KEY=<your-google-ai-key> (for AI features)');

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    console.error('\nFull error:', err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

console.log('🚀 Starting Supabase Database Setup');
console.log('=====================================\n');
await runMigration();

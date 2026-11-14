import { ensureDatabaseInitialized } from '../src/database/initDb.js';
import { closePool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

async function run() {
  console.log(`[DB INIT CLI] Target Database: ${env.PGUSER}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE} (SSL: ${env.PGSSL ? 'enabled' : 'disabled'})`);
  try {
    const result = await ensureDatabaseInitialized();
    console.log(`[DB INIT CLI] Success: ${result.message} (Action: ${result.action})`);
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('[DB INIT CLI FATAL] Database initialization failed:', err.message);
    await closePool();
    process.exit(1);
  }
}

run();

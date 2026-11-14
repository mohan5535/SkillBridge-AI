import { app } from './src/app.js';
import { env } from './src/config/env.js';
import { closePool } from './src/config/db.js';
import { checkDbAuthColumns } from './src/queries/authQueries.js';

let server;

// Graceful process termination handlers
async function handleShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing HTTP server and draining PostgreSQL pool...`);
  if (server) {
    server.close(async () => {
      try {
        await closePool();
        console.log('[SHUTDOWN] PostgreSQL pool drained cleanly. Exiting.');
        process.exit(0);
      } catch (err) {
        console.error('[SHUTDOWN ERROR] Failed to close database pool:', err.message);
        process.exit(1);
      }
    });
  } else {
    await closePool();
    process.exit(0);
  }

  // Force shutdown after 10s if connections fail to close
  setTimeout(() => {
    console.error('[SHUTDOWN TIMEOUT] Forcing exit after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

async function startServer() {
  if (env.NODE_ENV === 'production') {
    try {
      console.log('[STARTUP] Verifying production PostgreSQL connection and authentication schema...');
      await checkDbAuthColumns();
      console.log('[STARTUP] PostgreSQL authentication schema verified (Migration 002 active).');
    } catch (err) {
      console.error('[STARTUP FATAL] Production database initialization failed:', err.message);
      process.exit(1);
    }
  }

  server = app.listen(env.PORT, () => {
    console.log(`[GATEWAY READY] SkillBridge AI API Gateway running on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

startServer();


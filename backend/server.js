import { app } from './src/app.js';
import { env } from './src/config/env.js';
import { closePool } from './src/config/db.js';

const server = app.listen(env.PORT, () => {
  console.log(`[GATEWAY READY] SkillBridge AI API Gateway running on port ${env.PORT} (${env.NODE_ENV})`);
});

// Graceful process termination handlers
async function handleShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing HTTP server and draining PostgreSQL pool...`);
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

  // Force shutdown after 10s if connections fail to close
  setTimeout(() => {
    console.error('[SHUTDOWN TIMEOUT] Forcing exit after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));


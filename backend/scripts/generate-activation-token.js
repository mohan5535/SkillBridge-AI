#!/usr/bin/env node
/**
 * Administrative Activation Token Generation CLI Script
 *
 * Generates a single-use 256-bit activation token for existing unactivated accounts
 * (e.g. Priya Sharma, Rahul Verma, Ananya Desai) without assigning any shared passwords.
 *
 * Usage:
 *   node scripts/generate-activation-token.js --email "priya.sharma@example.com"
 */

import { authService } from '../src/services/auth.service.js';
import { findUserByEmail, assignActivationToken } from '../src/queries/authQueries.js';
import { closePool } from '../src/config/db.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[i + 1].trim();
      i++;
    }
  }
  return options;
}

export async function generateTokenForUser(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid --email argument is required.');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error(`No account found for email "${email}".`);
  }

  if (user.password_hash !== null) {
    throw new Error(`Account "${email}" has already established a password. Use password reset instead.`);
  }

  // Generate 256-bit token & SHA-256 hash
  const { rawToken, tokenHash } = authService.generateActivationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await assignActivationToken(email, tokenHash, expiresAt);

  const activationLink = `https://app.skillbridge.ai/activate?token=${rawToken}`;

  return {
    user,
    rawToken,
    tokenHash,
    expiresAt,
    activationLink,
  };
}

async function main() {
  const { email } = parseArgs();

  if (!email) {
    console.error('Usage: node scripts/generate-activation-token.js --email <email>');
    process.exit(1);
  }

  try {
    console.log(`[TOKEN GENERATION] Generating activation token for "${email}"...`);
    const result = await generateTokenForUser(email);

    console.log('\n================================================================');
    console.log(' ACTIVATION TOKEN GENERATED SUCCESSFULLY');
    console.log('================================================================');
    console.log(` User ID:         ${result.user.user_id}`);
    console.log(` Full Name:       ${result.user.full_name}`);
    console.log(` Email:           ${result.user.email}`);
    console.log(` Role:            ${result.user.role}`);
    console.log(` Token Hash (DB): ${result.tokenHash}`);
    console.log(` Expiration:      ${result.expiresAt.toISOString()}`);
    console.log('----------------------------------------------------------------');
    console.log(' SECURE ACTIVATION LINK:');
    console.log(` ${result.activationLink}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('[TOKEN GENERATION ERROR]', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

if (process.argv[1] && process.argv[1].endsWith('generate-activation-token.js')) {
  main();
}


#!/usr/bin/env node
/**
 * Administrative Counselor Account Provisioning CLI Script (AUTH-09)
 *
 * Provisions a Counselor identity without creating any shared or hardcoded passwords.
 * Generates a cryptographically secure, single-use 256-bit activation token,
 * persists its SHA-256 digest with a 24-hour expiration, and prints an out-of-band activation link.
 *
 * Usage:
 *   node scripts/provision-counselor.js --email "counselor.raj@skillbridge.org" --name "Rajesh Mehta"
 */

import { authService } from '../src/services/auth.service.js';
import { insertCounselor, findUserByEmail } from '../src/queries/authQueries.js';
import { closePool } from '../src/config/db.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[i + 1].trim();
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      options.name = args[i + 1].trim();
      i++;
    }
  }
  return options;
}

export async function provisionCounselor(email, name) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid --email argument is required.');
  }
  if (!name || name.length < 1) {
    throw new Error('Valid --name argument is required.');
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error(`Account with email "${email}" already exists.`);
  }

  // 1. Generate single-use 256-bit activation token and SHA-256 hash
  const { rawToken, tokenHash } = authService.generateActivationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 2. Persist counselor record with role='counselor' and password_hash=NULL
  const counselor = await insertCounselor(email, name, tokenHash, expiresAt);

  const activationLink = `https://app.skillbridge.ai/activate?token=${rawToken}`;

  return {
    counselor,
    rawToken,
    tokenHash,
    expiresAt,
    activationLink,
  };
}

async function main() {
  const { email, name } = parseArgs();

  if (!email || !name) {
    console.error('Usage: node scripts/provision-counselor.js --email <email> --name <fullName>');
    process.exit(1);
  }

  try {
    console.log(`[PROVISIONING] Creating counselor account for "${name}" <${email}>...`);
    const result = await provisionCounselor(email, name);

    console.log('\n================================================================');
    console.log(' COUNSELOR ACCOUNT PROVISIONED SUCCESSFULLY (ZERO HARDCODED PASSWORDS)');
    console.log('================================================================');
    console.log(` User ID:         ${result.counselor.user_id}`);
    console.log(` Full Name:       ${result.counselor.full_name}`);
    console.log(` Email:           ${result.counselor.email}`);
    console.log(` Role:            ${result.counselor.role}`);
    console.log(` Password Hash:   [NULL - Unclaimed Account]`);
    console.log(` Token Hash (DB): ${result.tokenHash}`);
    console.log(` Expiration:      ${result.expiresAt.toISOString()}`);
    console.log('----------------------------------------------------------------');
    console.log(' SECURE SINGLE-USE ACTIVATION LINK (Deliver out-of-band to Counselor):');
    console.log(` ${result.activationLink}`);
    console.log('================================================================');
    console.log(' NOTE: The counselor must use this link within 24 hours to set their');
    console.log(' private password via POST /api/auth/activate-account.\n');
  } catch (err) {
    console.error('[PROVISIONING ERROR]', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Execute when invoked directly from CLI
if (process.argv[1] && process.argv[1].endsWith('provision-counselor.js')) {
  main();
}


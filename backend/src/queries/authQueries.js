import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { DatabaseError } from '../errors/DatabaseError.js';

// SQL Query Constants (Production SQL when Migration 002 is applied)
export const SQL_QUERIES = {
  REGISTER_CANDIDATE: `
    INSERT INTO users (email, full_name, country, password_hash, role)
    VALUES ($1, $2, $3, $4, 'candidate')
    RETURNING user_id, email, full_name, role, created_at;
  `,
  GET_USER_BY_EMAIL: `
    SELECT user_id, email, full_name, role, password_hash, activation_token_hash, activation_token_expires_at
    FROM users
    WHERE email = $1;
  `,
  GET_USER_BY_ID: `
    SELECT user_id, email, full_name, role, created_at, updated_at
    FROM users
    WHERE user_id = $1;
  `,
  GET_USER_BY_ACTIVATION_HASH: `
    SELECT user_id, email, full_name, role, activation_token_expires_at
    FROM users
    WHERE activation_token_hash = $1
      AND activation_token_expires_at > CURRENT_TIMESTAMP
      AND password_hash IS NULL;
  `,
  ACTIVATE_USER_PASSWORD: `
    UPDATE users
    SET password_hash = $1,
        activation_token_hash = NULL,
        activation_token_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $2
    RETURNING user_id, email, full_name, role;
  `,
  SET_ACTIVATION_TOKEN: `
    UPDATE users
    SET activation_token_hash = $1,
        activation_token_expires_at = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE email = $3 AND password_hash IS NULL
    RETURNING user_id, email;
  `,
};

/**
 * In-memory Credential Store for Zero-Mutation execution
 * Preserves database state when Migration 002 is unexecuted per user directive.
 */
class AuthCredentialStore {
  constructor() {
    this.credentials = new Map(); // key: user_id or email
    this.dynamicUsers = new Map(); // registered in test/session
    this.nextDynamicId = 1000;
  }

  // Pre-seed known users from PostgreSQL baseline as unactivated
  initUser(userId, email, fullName, role = 'candidate') {
    if (env.NODE_ENV === 'production') {
      throw new DatabaseError('AuthCredentialStore cannot be accessed in production environment.');
    }
    if (!this.credentials.has(email)) {
      this.credentials.set(email, {
        userId,
        email,
        fullName,
        role,
        passwordHash: null,
        activationTokenHash: null,
        activationTokenExpiresAt: null,
      });
    }
  }

  getUserByEmail(email) {
    return this.credentials.get(email) || null;
  }

  getUserById(userId) {
    for (const user of this.credentials.values()) {
      if (user.userId === userId) return user;
    }
    return null;
  }

  getUserByActivationHash(tokenHash) {
    const now = new Date();
    for (const user of this.credentials.values()) {
      if (
        user.activationTokenHash === tokenHash &&
        user.passwordHash === null &&
        user.activationTokenExpiresAt &&
        user.activationTokenExpiresAt > now
      ) {
        return user;
      }
    }
    return null;
  }

  registerCandidate(email, fullName, passwordHash, country = 'India') {
    if (env.NODE_ENV === 'production') {
      throw new DatabaseError('AuthCredentialStore cannot be accessed in production environment.');
    }
    if (this.credentials.has(email)) {
      const err = new Error('User with this email already exists');
      err.code = '23505'; // PostgreSQL unique violation
      throw err;
    }
    const userId = this.nextDynamicId++;
    const user = {
      userId,
      email,
      fullName,
      country,
      role: 'candidate', // STRICTLY FORCED
      passwordHash,
      activationTokenHash: null,
      activationTokenExpiresAt: null,
      createdAt: new Date(),
    };
    this.credentials.set(email, user);
    this.dynamicUsers.set(userId, user);
    return user;
  }

  provisionCounselor(email, fullName, tokenHash, expiresAt) {
    if (this.credentials.has(email)) {
      const err = new Error('User with this email already exists');
      err.code = '23505';
      throw err;
    }
    const userId = this.nextDynamicId++;
    const user = {
      userId,
      email,
      fullName,
      role: 'counselor',
      passwordHash: null,
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: expiresAt,
      createdAt: new Date(),
    };
    this.credentials.set(email, user);
    this.dynamicUsers.set(userId, user);
    return user;
  }

  setActivationToken(email, tokenHash, expiresAt) {
    const user = this.credentials.get(email);
    if (!user || user.passwordHash !== null) {
      return null;
    }
    user.activationTokenHash = tokenHash;
    user.activationTokenExpiresAt = expiresAt;
    return user;
  }

  activatePassword(userId, newPasswordHash) {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.passwordHash = newPasswordHash;
    user.activationTokenHash = null;
    user.activationTokenExpiresAt = null;
    user.updatedAt = new Date();
    return user;
  }
}

export const authCredentialStore = new AuthCredentialStore();

// Pre-initialize Priya Sharma, Rahul Verma, Ananya Desai as unactivated candidates in non-production
if (env.NODE_ENV !== 'production') {
  authCredentialStore.initUser(1, 'priya.sharma@email.com', 'Priya Sharma', 'candidate');
  authCredentialStore.initUser(2, 'rahul.verma@email.com', 'Rahul Verma', 'candidate');
  authCredentialStore.initUser(3, 'ananya.desai@email.com', 'Ananya Desai', 'candidate');
  authCredentialStore.initUser(1, 'priya.sharma@example.com', 'Priya Sharma', 'candidate');
  authCredentialStore.initUser(2, 'rahul.verma@example.com', 'Rahul Verma', 'candidate');
  authCredentialStore.initUser(3, 'ananya.desai@example.com', 'Ananya Desai', 'candidate');
}

/**
 * Asynchronously checks if PostgreSQL users table has password_hash column.
 */
let dbHasAuthColumns = null;

export function resetDbAuthColumnsCache() {
  dbHasAuthColumns = null;
}

export async function checkDbAuthColumns() {
  if (dbHasAuthColumns !== null) return dbHasAuthColumns;
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    const hasColumns = res.rows.length > 0;
    if (env.NODE_ENV === 'production' && !hasColumns) {
      throw new DatabaseError(
        'Database authentication schema is missing in production. Migration 002 must be applied to persist credentials.'
      );
    }
    dbHasAuthColumns = hasColumns;
    return dbHasAuthColumns;
  } catch (err) {
    if (env.NODE_ENV === 'production') {
      throw err instanceof DatabaseError
        ? err
        : new DatabaseError(`Failed to introspect database authentication schema: ${err.message}`, err);
    }
    // In development / test, do not permanently cache false on query error so retries can succeed
    return false;
  }
}

export async function findUserByEmail(email) {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(SQL_QUERIES.GET_USER_BY_EMAIL, [email]);
    if (res.rows[0]) {
      return res.rows[0];
    }
  }

  if (env.NODE_ENV === 'production') {
    return null;
  }

  // Fallback to in-memory credential store in development/test
  const cred = authCredentialStore.getUserByEmail(email);
  if (!cred) return null;

  return {
    user_id: cred.userId,
    email: cred.email,
    full_name: cred.fullName,
    role: cred.role,
    password_hash: cred.passwordHash,
    activation_token_hash: cred.activationTokenHash,
    activation_token_expires_at: cred.activationTokenExpiresAt,
  };
}

export async function findUserById(userId) {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(SQL_QUERIES.GET_USER_BY_ID, [userId]);
    return res.rows[0] || null;
  }

  if (env.NODE_ENV === 'production') {
    throw new DatabaseError('In-memory authentication fallback is strictly prohibited in production.');
  }

  const cred = authCredentialStore.getUserById(userId);
  if (cred) {
    return {
      user_id: cred.userId,
      email: cred.email,
      full_name: cred.fullName,
      role: cred.role,
      created_at: cred.createdAt,
    };
  }

  try {
    const dbRes = await pool.query('SELECT user_id, email, full_name FROM users WHERE user_id = $1', [userId]);
    if (dbRes.rows.length > 0) {
      const dbUser = dbRes.rows[0];
      return {
        user_id: dbUser.user_id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        role: 'candidate',
      };
    }
  } catch {
    // DB offline
  }

  return null;
}

export async function findUserByActivationHash(tokenHash) {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(SQL_QUERIES.GET_USER_BY_ACTIVATION_HASH, [tokenHash]);
    if (res.rows[0]) {
      return res.rows[0];
    }
  }

  if (env.NODE_ENV === 'production') {
    throw new DatabaseError('In-memory authentication fallback is strictly prohibited in production.');
  }

  const cred = authCredentialStore.getUserByActivationHash(tokenHash);
  if (!cred) return null;

  return {
    user_id: cred.userId,
    email: cred.email,
    full_name: cred.fullName,
    role: cred.role,
    activation_token_expires_at: cred.activationTokenExpiresAt,
  };
}

export async function insertCandidate(email, fullName, passwordHash, country = 'India') {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(SQL_QUERIES.REGISTER_CANDIDATE, [email, fullName, country, passwordHash]);
    if (res.rows[0]) {
      return res.rows[0];
    }
  }

  if (env.NODE_ENV === 'production') {
    throw new DatabaseError('In-memory authentication fallback is strictly prohibited in production.');
  }

  const user = authCredentialStore.registerCandidate(email, fullName, passwordHash, country);
  return {
    user_id: user.userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    created_at: user.createdAt,
  };
}

export async function updateUserPassword(userId, passwordHash) {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(SQL_QUERIES.ACTIVATE_USER_PASSWORD, [passwordHash, userId]);
    if (res.rows[0]) {
      return res.rows[0];
    }
  }

  if (env.NODE_ENV === 'production') {
    throw new DatabaseError('In-memory authentication fallback is strictly prohibited in production.');
  }

  const user = authCredentialStore.activatePassword(userId, passwordHash);
  if (!user) return null;
  return {
    user_id: user.userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
  };
}

export async function assignActivationToken(email, tokenHash, expiresAt) {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(SQL_QUERIES.SET_ACTIVATION_TOKEN, [tokenHash, expiresAt, email]);
    if (res.rows[0]) {
      return res.rows[0];
    }
  }

  if (env.NODE_ENV === 'production') {
    throw new DatabaseError('In-memory authentication fallback is strictly prohibited in production.');
  }

  // Ensure user is loaded from DB if exists
  await findUserByEmail(email);
  return authCredentialStore.setActivationToken(email, tokenHash, expiresAt);
}

export async function insertCounselor(email, fullName, tokenHash, expiresAt) {
  const hasColumns = await checkDbAuthColumns();
  if (hasColumns) {
    const res = await pool.query(
      `INSERT INTO users (email, full_name, role, password_hash, activation_token_hash, activation_token_expires_at)
       VALUES ($1, $2, 'counselor', NULL, $3, $4)
       RETURNING user_id, email, full_name, role`,
      [email, fullName, tokenHash, expiresAt]
    );
    return res.rows[0];
  }

  if (env.NODE_ENV === 'production') {
    throw new DatabaseError('In-memory authentication fallback is strictly prohibited in production.');
  }

  const user = authCredentialStore.provisionCounselor(email, fullName, tokenHash, expiresAt);
  return {
    user_id: user.userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
  };
}


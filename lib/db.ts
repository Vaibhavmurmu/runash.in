import { Pool, PoolClient, QueryConfig, QueryResult } from 'pg';

// Use DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable');
}

export const pool = new Pool({
  connectionString,
  // Recommended for serverless environments like Neon: keep pool small
  max: 2,
  // increase idle timeout so Neon doesn't prematurely close
  idleTimeoutMillis: 30000,
});

// Simple SQL tagged template helper: sql`SELECT * FROM users WHERE id = ${id}`
export function sql(strings: TemplateStringsArray, ...values: any[]) {
  let text = '';
  const params: any[] = [];
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  return { text, values: params } as QueryConfig;
}

// Convenience query function
export async function query<T = any>(textOrConfig: string | QueryConfig, params?: any[]): Promise<QueryResult<T>> {
  if (typeof textOrConfig === 'string') {
    return pool.query<T>(textOrConfig, params);
  }
  return pool.query<T>(textOrConfig);
}

// Get a client from the pool. Caller must release() when done.
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

// Initialize DB schema for users, sessions, verification_tokens, chat_sessions
async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable pgcrypto for gen_random_uuid
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text,
        email text UNIQUE,
        email_verified timestamptz,
        image text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        session_token text UNIQUE,
        access_token text UNIQUE,
        expires timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Verification tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier text NOT NULL,
        token text NOT NULL UNIQUE,
        expires timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Chat sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        title text,
        metadata jsonb,
        messages jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Helpful indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification_tokens(identifier)`);

    await client.query('COMMIT');
    // Keep a small log
    // eslint-disable-next-line no-console
    console.info('Database initialized (users, sessions, verification_tokens, chat_sessions)');
  } catch (err) {
    await client.query('ROLLBACK');
    // eslint-disable-next-line no-console
    console.error('Failed to initialize database schema', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run initialization but don't block import. Expose a promise if callers want to await.
export const ready = init();

// Graceful shutdown helper
export async function closePool() {
  await pool.end();
}

import { Pool } from 'pg';

export const pgPool = new Pool({
  user: process.env.POSTGRES_USER || 'rce_admin',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'rce_engine_db',
  password: process.env.POSTGRES_PASSWORD || 'rce_secret_password',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initPostgresTables(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Problems Table
      CREATE TABLE IF NOT EXISTS problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        constraints TEXT NOT NULL,
        test_cases JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Submissions Table
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        language VARCHAR(30) NOT NULL,
        code TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for fast lookup
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
    `);
    console.log('[PostgreSQL] Database tables initialized successfully.');
  } catch (error) {
    console.error('[PostgreSQL] Table initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

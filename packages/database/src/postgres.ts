import { Pool } from 'pg';
import {
  ProblemDTO,
  TestCaseDTO,
  UserDTO,
  SubmissionHistoryItem,
  ContestDTO,
  ContestProblemDTO,
  ContestLeaderboardEntry,
  ContestStatus,
} from '@rce/shared';

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
        name VARCHAR(100) NOT NULL DEFAULT 'User',
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT,
        role VARCHAR(20) NOT NULL DEFAULT 'USER',
        current_streak INTEGER NOT NULL DEFAULT 0,
        last_submission_date DATE,
        questions_solved INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Problems Table
      CREATE TABLE IF NOT EXISTS problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        time_limit_ms INTEGER NOT NULL DEFAULT 2000,
        memory_limit_mb INTEGER NOT NULL DEFAULT 256,
        constraints TEXT,
        topics TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Test Cases Table
      CREATE TABLE IF NOT EXISTS test_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        input TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_hidden BOOLEAN NOT NULL DEFAULT true,
        explanation TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Submissions Table
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        code_hash VARCHAR(64),
        language VARCHAR(30) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        passed_test_cases INTEGER NOT NULL DEFAULT 0,
        total_test_cases INTEGER NOT NULL DEFAULT 0,
        max_runtime_ms INTEGER NOT NULL DEFAULT 0,
        max_memory_mb INTEGER NOT NULL DEFAULT 0,
        cache_hit BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Contests Table
      CREATE TABLE IF NOT EXISTS contests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 120,
        visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
        rules TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Contest Problems Mapping Table
      CREATE TABLE IF NOT EXISTS contest_problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        problem_label VARCHAR(10) NOT NULL,
        points INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(contest_id, problem_id),
        UNIQUE(contest_id, problem_label)
      );

      -- Contest Participants Table
      CREATE TABLE IF NOT EXISTS contest_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(contest_id, user_id)
      );

      -- Contest Submissions Logging Table
      CREATE TABLE IF NOT EXISTS contest_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        penalty_seconds INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration Column Safety Checks
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT 'User';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_submission_date DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_solved INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE problems ADD COLUMN IF NOT EXISTS constraints TEXT;
      ALTER TABLE problems ADD COLUMN IF NOT EXISTS topics TEXT[];
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS code_hash VARCHAR(64);
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN NOT NULL DEFAULT false;

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);
      CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON test_cases(problem_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_code_hash ON submissions(user_id, problem_id, code_hash);
      CREATE INDEX IF NOT EXISTS idx_contests_slug ON contests(slug);
      CREATE INDEX IF NOT EXISTS idx_contest_problems_contest ON contest_problems(contest_id);
    `);

    // Ensure default admin user exists
    await client.query(`
      INSERT INTO users (id, name, username, email, role)
      VALUES ('00000000-0000-0000-0000-000000000001', 'System Admin', 'admin', 'admin@codeforge.io', 'ADMIN')
      ON CONFLICT (username) DO NOTHING;
    `);

    await seedSampleProblemsIfEmpty(client);
    await seedSampleContestIfEmpty(client);

    console.log('[PostgreSQL] Database tables & migrations initialized successfully.');
  } catch (error) {
    console.error('[PostgreSQL] Table initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedSampleProblemsIfEmpty(client: any): Promise<void> {
  const { rows } = await client.query('SELECT COUNT(*) FROM problems');
  if (parseInt(rows[0].count, 10) > 0) return;

  const p1Res = await client.query(`
    INSERT INTO problems (id, title, slug, description, difficulty, time_limit_ms, memory_limit_mb, constraints, topics)
    VALUES (
      'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      'Two Sum',
      'two-sum',
      'Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.\n\nInput format: Line 1 array numbers separated by space. Line 2 target integer.',
      'EASY',
      2000,
      256,
      '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
      ARRAY['Arrays', 'Hashing', 'Two Pointers']
    )
    RETURNING id;
  `);

  const p1Id = p1Res.rows[0].id;
  await client.query(`
    INSERT INTO test_cases (problem_id, input, expected_output, is_hidden, explanation) VALUES
    ('${p1Id}', '2 7 11 15\n9', '[0, 1]', false, 'nums[0] + nums[1] == 9'),
    ('${p1Id}', '3 2 4\n6', '[1, 2]', false, 'nums[1] + nums[2] == 6'),
    ('${p1Id}', '3 3\n6', '[0, 1]', true, 'Hidden edge case'),
    ('${p1Id}', '1 5 8 11 15\n26', '[3, 4]', true, 'Hidden large input case');
  `);

  const p2Res = await client.query(`
    INSERT INTO problems (id, title, slug, description, difficulty, time_limit_ms, memory_limit_mb, constraints, topics)
    VALUES (
      'a3b8d1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f',
      'Reverse String',
      'reverse-string',
      'Write a function that reverses a string input passed via stdin.',
      'EASY',
      1000,
      128,
      '1 <= s.length <= 10^5\ns consists of printable ASCII characters',
      ARRAY['Strings', 'Two Pointers', 'Recursion']
    )
    RETURNING id;
  `);

  const p2Id = p2Res.rows[0].id;
  await client.query(`
    INSERT INTO test_cases (problem_id, input, expected_output, is_hidden, explanation) VALUES
    ('${p2Id}', 'hello', 'olleh', false, 'Reversed hello is olleh'),
    ('${p2Id}', 'CodeForge', 'egroFedoC', false, 'Reversed CodeForge is egroFedoC'),
    ('${p2Id}', 'racecar', 'racecar', true, 'Palindrome test case'),
    ('${p2Id}', 'a', 'a', true, 'Single character');
  `);
}

async function seedSampleContestIfEmpty(client: any): Promise<void> {
  const { rows } = await client.query('SELECT COUNT(*) FROM contests');
  if (parseInt(rows[0].count, 10) > 0) return;

  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60000).toISOString(); // Started 10 mins ago
  const endTime = new Date(now.getTime() + 110 * 60000).toISOString(); // Ends in 110 mins

  const cRes = await client.query(`
    INSERT INTO contests (title, slug, description, start_time, end_time, duration_minutes, visibility, rules)
    VALUES (
      'CodeForge Starter Contest #1',
      'codeforge-starter-contest-1',
      'Welcome to CodeForge Weekly Contest 1! Solve algorithm problems, rank on the live leaderboard, and boost your streak.',
      '${startTime}',
      '${endTime}',
      120,
      'PUBLIC',
      '1. No plagiarism allowed.\n2. Submissions lock automatically when contest ends.\n3. Equal score breaks tie by penalty time.'
    )
    RETURNING id;
  `);

  const contestId = cRes.rows[0].id;
  const probRows = await client.query(`SELECT id FROM problems ORDER BY created_at ASC LIMIT 2`);
  if (probRows.rows.length >= 2) {
    await client.query(`
      INSERT INTO contest_problems (contest_id, problem_id, problem_label, points) VALUES
      ('${contestId}', '${probRows.rows[0].id}', 'A', 100),
      ('${contestId}', '${probRows.rows[1].id}', 'B', 200)
      ON CONFLICT DO NOTHING;
    `);
  }
}

// ==========================================
// User Authentication & Admin Management Helpers
// ==========================================

export async function createUser(data: {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role?: 'ADMIN' | 'USER';
}): Promise<UserDTO> {
  const { rows } = await pgPool.query(
    `INSERT INTO users (name, username, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, username, email, role, current_streak as "currentStreak", questions_solved as "questionsSolved", last_submission_date as "lastSubmissionDate", created_at as "createdAt"`,
    [data.name, data.username, data.email, data.passwordHash, data.role || 'USER']
  );
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<(UserDTO & { password_hash?: string }) | null> {
  const { rows } = await pgPool.query(
    `SELECT id, name, username, email, password_hash, role, current_streak as "currentStreak", questions_solved as "questionsSolved", last_submission_date as "lastSubmissionDate", created_at as "createdAt"
     FROM users WHERE email = $1`,
    [email]
  );
  if (rows.length === 0) return null;
  return rows[0];
}

export async function getUserById(id: string): Promise<UserDTO | null> {
  const { rows } = await pgPool.query(
    `SELECT id, name, username, email, role, current_streak as "currentStreak", questions_solved as "questionsSolved", last_submission_date as "lastSubmissionDate", created_at as "createdAt"
     FROM users WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  return rows[0];
}

export async function getAllUsers(): Promise<UserDTO[]> {
  const { rows } = await pgPool.query(
    `SELECT id, name, username, email, role, current_streak as "currentStreak", questions_solved as "questionsSolved", last_submission_date as "lastSubmissionDate", created_at as "createdAt"
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function updateUserRole(userId: string, role: 'ADMIN' | 'USER'): Promise<UserDTO | null> {
  const { rows } = await pgPool.query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id, name, username, email, role, current_streak as "currentStreak", questions_solved as "questionsSolved", last_submission_date as "lastSubmissionDate", created_at as "createdAt"`,
    [userId, role]
  );
  if (rows.length === 0) return null;
  return rows[0];
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const { rowCount } = await pgPool.query('DELETE FROM users WHERE id = $1', [userId]);
  return (rowCount ?? 0) > 0;
}

export async function getUserSolvedProblemIds(userId: string): Promise<string[]> {
  const { rows } = await pgPool.query(
    `SELECT DISTINCT problem_id FROM submissions WHERE user_id = $1 AND status = 'ACCEPTED'`,
    [userId]
  );
  return rows.map((r) => r.problem_id);
}

export async function getUserDetailedStats(userId: string): Promise<{
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  currentStreak: number;
  longestStreak: number;
  totalSubmissions: number;
}> {
  const statsRes = await pgPool.query(
    `SELECT 
       COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'ACCEPTED') as "totalSolved",
       COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'ACCEPTED' AND (p.difficulty = 'EASY' OR p.difficulty IS NULL)) as "easySolved",
       COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'ACCEPTED' AND p.difficulty = 'MEDIUM') as "mediumSolved",
       COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'ACCEPTED' AND p.difficulty = 'HARD') as "hardSolved",
       COUNT(s.id) as "totalSubmissions"
     FROM submissions s
     LEFT JOIN problems p ON s.problem_id = p.id
     WHERE s.user_id = $1`,
    [userId]
  );

  const userRes = await pgPool.query(
    `SELECT current_streak FROM users WHERE id = $1`,
    [userId]
  );

  const stats = statsRes.rows[0] || {};
  const user = userRes.rows[0] || {};

  const totalSolved = parseInt(stats.totalSolved || '0', 10);
  const easySolved = parseInt(stats.easySolved || '0', 10);
  const mediumSolved = parseInt(stats.mediumSolved || '0', 10);
  const hardSolved = parseInt(stats.hardSolved || '0', 10);
  const totalSubmissions = parseInt(stats.totalSubmissions || '0', 10);
  const streak = user.current_streak || (totalSolved > 0 ? 1 : 0);

  return {
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    currentStreak: streak,
    longestStreak: Math.max(streak, totalSolved > 0 ? 1 : 0),
    totalSubmissions,
  };
}

export async function updateUserStatsOnAccept(userId: string, problemId: string): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // Count how many unique accepted problems user has
    const countRes = await client.query(
      `SELECT COUNT(DISTINCT problem_id) as count FROM submissions WHERE user_id = $1 AND status = 'ACCEPTED'`,
      [userId]
    );

    const totalSolved = parseInt(countRes.rows[0]?.count || '1', 10);

    const userRes = await client.query(
      `SELECT current_streak, last_submission_date FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const todayStr = new Date().toISOString().split('T')[0];
      let newStreak = user.current_streak || 1;

      if (!user.last_submission_date) {
        newStreak = 1;
      } else {
        const lastDate = new Date(user.last_submission_date);
        const todayDate = new Date(todayStr);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      await client.query(
        `UPDATE users
         SET current_streak = $1,
             last_submission_date = $2,
             questions_solved = $3
         WHERE id = $4`,
        [newStreak, todayStr, totalSolved, userId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Update user stats failed:', err);
  } finally {
    client.release();
  }
}

// ==========================================
// Submission Check & History Helpers
// ==========================================

export async function getExistingUserSubmission(
  userId: string,
  problemId: string,
  codeHash: string
): Promise<SubmissionHistoryItem | null> {
  const { rows } = await pgPool.query(
    `SELECT s.id, s.user_id as "userId", s.problem_id as "problemId", p.title as "problemTitle",
            s.language, s.status, s.passed_test_cases as "passedCount", s.total_test_cases as "totalCount",
            s.max_runtime_ms as "maxRuntimeMs", s.max_memory_mb as "maxMemoryMb", s.cache_hit as "cacheHit",
            s.created_at as "createdAt"
     FROM submissions s
     JOIN problems p ON s.problem_id = p.id
     WHERE s.user_id = $1 AND s.problem_id = $2 AND s.code_hash = $3 AND s.status != 'PENDING'
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId, problemId, codeHash]
  );

  if (rows.length === 0) return null;
  return rows[0];
}

export async function getUserSubmissionHistory(userId: string): Promise<SubmissionHistoryItem[]> {
  const { rows } = await pgPool.query(
    `SELECT s.id, s.user_id as "userId", s.problem_id as "problemId", p.title as "problemTitle",
            s.language, s.status, s.passed_test_cases as "passedCount", s.total_test_cases as "totalCount",
            s.max_runtime_ms as "maxRuntimeMs", s.max_memory_mb as "maxMemoryMb", s.cache_hit as "cacheHit",
            s.created_at as "createdAt"
     FROM submissions s
     JOIN problems p ON s.problem_id = p.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

// ==========================================
// Problem Database Operations with Constraints & Topics
// ==========================================

export async function getAllProblems(includeHiddenCount = true, topicFilter?: string): Promise<ProblemDTO[]> {
  let query = `
    SELECT p.id, p.title, p.slug, p.description, p.difficulty, p.time_limit_ms as "timeLimitMs",
           p.memory_limit_mb as "memoryLimitMb", p.constraints, p.topics, p.created_at as "createdAt",
           COUNT(tc.id)::int as "testCasesCount"
    FROM problems p
    LEFT JOIN test_cases tc ON p.id = tc.problem_id
  `;

  const values: any[] = [];
  if (topicFilter && topicFilter !== 'ALL') {
    query += ` WHERE $1 = ANY(p.topics)`;
    values.push(topicFilter);
  }

  query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

  const { rows } = await pgPool.query(query, values);
  return rows;
}

export async function getProblemBySlug(slug: string, includeHidden = false): Promise<ProblemDTO | null> {
  const probRes = await pgPool.query(
    `SELECT id, title, slug, description, difficulty, time_limit_ms as "timeLimitMs",
            memory_limit_mb as "memoryLimitMb", constraints, topics, created_at as "createdAt"
     FROM problems WHERE slug = $1`,
    [slug]
  );
  if (probRes.rows.length === 0) return null;
  const problem = probRes.rows[0];

  const tcQuery = includeHidden
    ? `SELECT id, problem_id as "problemId", input, expected_output as "expectedOutput", is_hidden as "isHidden", explanation FROM test_cases WHERE problem_id = $1 ORDER BY is_hidden ASC, created_at ASC`
    : `SELECT id, problem_id as "problemId", input, expected_output as "expectedOutput", is_hidden as "isHidden", explanation FROM test_cases WHERE problem_id = $1 AND is_hidden = false ORDER BY created_at ASC`;

  const tcRes = await pgPool.query(tcQuery, [problem.id]);
  problem.testCases = tcRes.rows;
  return problem;
}

export async function getProblemById(id: string, includeHidden = false): Promise<ProblemDTO | null> {
  const probRes = await pgPool.query(
    `SELECT id, title, slug, description, difficulty, time_limit_ms as "timeLimitMs",
            memory_limit_mb as "memoryLimitMb", constraints, topics, created_at as "createdAt"
     FROM problems WHERE id = $1`,
    [id]
  );
  if (probRes.rows.length === 0) return null;
  const problem = probRes.rows[0];

  const tcQuery = includeHidden
    ? `SELECT id, problem_id as "problemId", input, expected_output as "expectedOutput", is_hidden as "isHidden", explanation FROM test_cases WHERE problem_id = $1 ORDER BY is_hidden ASC, created_at ASC`
    : `SELECT id, problem_id as "problemId", input, expected_output as "expectedOutput", is_hidden as "isHidden", explanation FROM test_cases WHERE problem_id = $1 AND is_hidden = false ORDER BY created_at ASC`;

  const tcRes = await pgPool.query(tcQuery, [problem.id]);
  problem.testCases = tcRes.rows;
  return problem;
}

export async function getTestCasesForProblem(problemId: string): Promise<TestCaseDTO[]> {
  const { rows } = await pgPool.query(
    `SELECT id, problem_id as "problemId", input, expected_output as "expectedOutput", is_hidden as "isHidden", explanation FROM test_cases WHERE problem_id = $1 ORDER BY is_hidden ASC, created_at ASC`,
    [problemId]
  );
  return rows;
}

export async function createProblemWithTestCases(
  problem: Omit<ProblemDTO, 'id' | 'createdAt'>,
  testCases: TestCaseDTO[]
): Promise<ProblemDTO> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const slug = problem.slug || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const probRes = await client.query(
      `INSERT INTO problems (title, slug, description, difficulty, time_limit_ms, memory_limit_mb, constraints, topics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, slug, description, difficulty, time_limit_ms as "timeLimitMs", memory_limit_mb as "memoryLimitMb", constraints, topics, created_at as "createdAt"`,
      [
        problem.title,
        slug,
        problem.description,
        problem.difficulty,
        problem.timeLimitMs || 2000,
        problem.memoryLimitMb || 256,
        problem.constraints || null,
        problem.topics || [],
      ]
    );

    const newProblem = probRes.rows[0];
    const createdTcList: TestCaseDTO[] = [];

    for (const tc of testCases) {
      const tcRes = await client.query(
        `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden, explanation)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, problem_id as "problemId", input, expected_output as "expectedOutput", is_hidden as "isHidden", explanation`,
        [newProblem.id, tc.input, tc.expectedOutput, tc.isHidden, tc.explanation || null]
      );
      createdTcList.push(tcRes.rows[0]);
    }

    await client.query('COMMIT');
    newProblem.testCases = createdTcList;
    return newProblem;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProblemWithTestCases(
  id: string,
  problem: Partial<ProblemDTO>,
  testCases?: TestCaseDTO[]
): Promise<ProblemDTO | null> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (problem.title) {
      fields.push(`title = $${idx++}`);
      values.push(problem.title);
    }
    if (problem.slug) {
      fields.push(`slug = $${idx++}`);
      values.push(problem.slug);
    }
    if (problem.description) {
      fields.push(`description = $${idx++}`);
      values.push(problem.description);
    }
    if (problem.difficulty) {
      fields.push(`difficulty = $${idx++}`);
      values.push(problem.difficulty);
    }
    if (problem.timeLimitMs) {
      fields.push(`time_limit_ms = $${idx++}`);
      values.push(problem.timeLimitMs);
    }
    if (problem.memoryLimitMb) {
      fields.push(`memory_limit_mb = $${idx++}`);
      values.push(problem.memoryLimitMb);
    }
    if (problem.constraints !== undefined) {
      fields.push(`constraints = $${idx++}`);
      values.push(problem.constraints);
    }
    if (problem.topics !== undefined) {
      fields.push(`topics = $${idx++}`);
      values.push(problem.topics);
    }

    if (fields.length > 0) {
      values.push(id);
      await client.query(`UPDATE problems SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }

    if (testCases) {
      await client.query('DELETE FROM test_cases WHERE problem_id = $1', [id]);
      for (const tc of testCases) {
        await client.query(
          `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden, explanation)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, tc.input, tc.expectedOutput, tc.isHidden, tc.explanation || null]
        );
      }
    }

    await client.query('COMMIT');
    return await getProblemById(id, true);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProblem(id: string): Promise<boolean> {
  const { rowCount } = await pgPool.query('DELETE FROM problems WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function createSubmissionRecord(data: {
  id: string;
  userId?: string;
  problemId: string;
  code: string;
  codeHash?: string;
  language: string;
  status: string;
  cacheHit?: boolean;
}): Promise<void> {
  await pgPool.query(
    `INSERT INTO submissions (id, user_id, problem_id, code, code_hash, language, status, cache_hit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.id,
      data.userId || null,
      data.problemId,
      data.code,
      data.codeHash || null,
      data.language,
      data.status,
      data.cacheHit || false,
    ]
  );
}

export async function updateSubmissionResult(data: {
  id: string;
  status: string;
  passedCount: number;
  totalCount: number;
  maxRuntimeMs: number;
  maxMemoryMb: number;
  cacheHit?: boolean;
}): Promise<void> {
  await pgPool.query(
    `UPDATE submissions
     SET status = $2, passed_test_cases = $3, total_test_cases = $4, max_runtime_ms = $5, max_memory_mb = $6, cache_hit = $7
     WHERE id = $1`,
    [data.id, data.status, data.passedCount, data.totalCount, data.maxRuntimeMs, data.maxMemoryMb, data.cacheHit || false]
  );
}

// ==========================================
// Contest System Database Helpers
// ==========================================

export async function getAllContests(userId?: string): Promise<ContestDTO[]> {
  const { rows } = await pgPool.query(
    `SELECT c.id, c.title, c.slug, c.description, c.start_time as "startTime", c.end_time as "endTime",
            c.duration_minutes as "durationMinutes", c.visibility, c.rules, c.created_at as "createdAt",
            COUNT(DISTINCT cp.user_id)::int as "registeredCount"
     FROM contests c
     LEFT JOIN contest_participants cp ON c.id = cp.contest_id
     GROUP BY c.id
     ORDER BY c.start_time DESC`
  );

  const now = new Date();
  const contestList: ContestDTO[] = [];

  for (const c of rows) {
    const start = new Date(c.startTime);
    const end = new Date(c.endTime);

    let status: ContestStatus = 'UPCOMING';
    if (now >= start && now <= end) {
      status = 'RUNNING';
    } else if (now > end) {
      status = 'ENDED';
    }

    let isRegistered = false;
    if (userId) {
      const regRes = await pgPool.query(
        `SELECT id FROM contest_participants WHERE contest_id = $1 AND user_id = $2`,
        [c.id, userId]
      );
      isRegistered = regRes.rows.length > 0;
    }

    // Get count of problems
    const probCountRes = await pgPool.query(
      `SELECT COUNT(*)::int as count FROM contest_problems WHERE contest_id = $1`,
      [c.id]
    );

    contestList.push({
      ...c,
      status,
      isRegistered,
      problems: Array(probCountRes.rows[0].count).fill(null), // placeholder array length
    });
  }

  return contestList;
}

export async function getContestBySlug(slug: string, userId?: string): Promise<ContestDTO | null> {
  const { rows } = await pgPool.query(
    `SELECT c.id, c.title, c.slug, c.description, c.start_time as "startTime", c.end_time as "endTime",
            c.duration_minutes as "durationMinutes", c.visibility, c.rules, c.created_at as "createdAt"
     FROM contests c WHERE slug = $1`,
    [slug]
  );
  if (rows.length === 0) return null;
  const contest = rows[0];

  const now = new Date();
  const start = new Date(contest.startTime);
  const end = new Date(contest.endTime);

  let status: ContestStatus = 'UPCOMING';
  if (now >= start && now <= end) {
    status = 'RUNNING';
  } else if (now > end) {
    status = 'ENDED';
  }
  contest.status = status;

  if (userId) {
    const regRes = await pgPool.query(
      `SELECT id FROM contest_participants WHERE contest_id = $1 AND user_id = $2`,
      [contest.id, userId]
    );
    contest.isRegistered = regRes.rows.length > 0;
  }

  // Fetch contest problems
  const cpRes = await pgPool.query(
    `SELECT cp.id, cp.contest_id as "contestId", cp.problem_id as "problemId", cp.problem_label as "problemLabel",
            cp.points, p.title, p.slug, p.description, p.difficulty, p.time_limit_ms as "timeLimitMs",
            p.memory_limit_mb as "memoryLimitMb", p.constraints, p.topics
     FROM contest_problems cp
     JOIN problems p ON cp.problem_id = p.id
     WHERE cp.contest_id = $1
     ORDER BY cp.problem_label ASC`,
    [contest.id]
  );

  const contestProblems: ContestProblemDTO[] = [];
  for (const cp of cpRes.rows) {
    let solved = false;
    let latestStatus = null;

    if (userId) {
      const subRes = await pgPool.query(
        `SELECT status FROM submissions
         WHERE user_id = $1 AND problem_id = $2 AND status = 'ACCEPTED'
         LIMIT 1`,
        [userId, cp.problemId]
      );
      if (subRes.rows.length > 0) {
        solved = true;
        latestStatus = 'ACCEPTED';
      }
    }

    contestProblems.push({
      id: cp.id,
      contestId: cp.contestId,
      problemId: cp.problemId,
      problemLabel: cp.problemLabel,
      points: cp.points,
      solved,
      submissionStatus: latestStatus,
      problem: {
        id: cp.problemId,
        title: cp.title,
        slug: cp.slug,
        description: cp.description,
        difficulty: cp.difficulty,
        timeLimitMs: cp.timeLimitMs,
        memoryLimitMb: cp.memoryLimitMb,
        constraints: cp.constraints,
        topics: cp.topics,
      },
    });
  }

  contest.problems = contestProblems;
  return contest;
}

export async function createContest(
  contest: {
    title: string;
    slug?: string;
    description: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
    rules?: string;
  },
  problemIds: string[]
): Promise<ContestDTO> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const slug = contest.slug || contest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const cRes = await client.query(
      `INSERT INTO contests (title, slug, description, start_time, end_time, duration_minutes, visibility, rules)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, slug, description, start_time as "startTime", end_time as "endTime",
                 duration_minutes as "durationMinutes", visibility, rules, created_at as "createdAt"`,
      [
        contest.title,
        slug,
        contest.description,
        contest.startTime,
        contest.endTime,
        contest.durationMinutes || 120,
        contest.visibility || 'PUBLIC',
        contest.rules || null,
      ]
    );

    const newContest = cRes.rows[0];
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    for (let i = 0; i < problemIds.length; i++) {
      const pid = problemIds[i];
      const label = labels[i] || `P${i + 1}`;
      await client.query(
        `INSERT INTO contest_problems (contest_id, problem_id, problem_label, points)
         VALUES ($1, $2, $3, $4)`,
        [newContest.id, pid, label, (i + 1) * 100]
      );
    }

    await client.query('COMMIT');
    return newContest;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateContest(
  id: string,
  contestData: Partial<ContestDTO>,
  problemIds?: string[]
): Promise<ContestDTO | null> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (contestData.title) {
      fields.push(`title = $${idx++}`);
      values.push(contestData.title);
    }
    if (contestData.slug) {
      fields.push(`slug = $${idx++}`);
      values.push(contestData.slug);
    }
    if (contestData.description) {
      fields.push(`description = $${idx++}`);
      values.push(contestData.description);
    }
    if (contestData.startTime) {
      fields.push(`start_time = $${idx++}`);
      values.push(contestData.startTime);
    }
    if (contestData.endTime) {
      fields.push(`end_time = $${idx++}`);
      values.push(contestData.endTime);
    }
    if (contestData.durationMinutes) {
      fields.push(`duration_minutes = $${idx++}`);
      values.push(contestData.durationMinutes);
    }
    if (contestData.visibility) {
      fields.push(`visibility = $${idx++}`);
      values.push(contestData.visibility);
    }
    if (contestData.rules !== undefined) {
      fields.push(`rules = $${idx++}`);
      values.push(contestData.rules);
    }

    if (fields.length > 0) {
      values.push(id);
      await client.query(`UPDATE contests SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }

    if (problemIds) {
      await client.query('DELETE FROM contest_problems WHERE contest_id = $1', [id]);
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (let i = 0; i < problemIds.length; i++) {
        const pid = problemIds[i];
        const label = labels[i] || `P${i + 1}`;
        await client.query(
          `INSERT INTO contest_problems (contest_id, problem_id, problem_label, points)
           VALUES ($1, $2, $3, $4)`,
          [id, pid, label, (i + 1) * 100]
        );
      }
    }

    await client.query('COMMIT');
    return await getContestBySlug(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteContest(id: string): Promise<boolean> {
  const { rowCount } = await pgPool.query('DELETE FROM contests WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function registerUserForContest(contestId: string, userId: string): Promise<boolean> {
  const { rowCount } = await pgPool.query(
    `INSERT INTO contest_participants (contest_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (contest_id, user_id) DO NOTHING`,
    [contestId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function recordContestSubmission(data: {
  contestId: string;
  submissionId: string;
  userId: string;
  problemId: string;
  status: string;
  points: number;
  penaltySeconds: number;
}): Promise<void> {
  await pgPool.query(
    `INSERT INTO contest_submissions (contest_id, submission_id, user_id, problem_id, status, points, penalty_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [data.contestId, data.submissionId, data.userId, data.problemId, data.status, data.points, data.penaltySeconds]
  );
}

export async function getContestLeaderboard(contestId: string): Promise<ContestLeaderboardEntry[]> {
  const query = `
    SELECT u.id as "userId", u.username, u.name,
           COUNT(DISTINCT CASE WHEN cs.status = 'ACCEPTED' THEN cs.problem_id END)::int as "problemsSolved",
           COALESCE(SUM(CASE WHEN cs.status = 'ACCEPTED' THEN cs.points ELSE 0 END), 0)::int as "totalScore",
           COALESCE(SUM(cs.penalty_seconds), 0)::int as "penaltySeconds",
           COUNT(cs.id)::int as "submissionsCount"
    FROM contest_participants cp
    JOIN users u ON cp.user_id = u.id
    LEFT JOIN contest_submissions cs ON cp.contest_id = cs.contest_id AND cp.user_id = cs.user_id
    WHERE cp.contest_id = $1
    GROUP BY u.id, u.username, u.name
    ORDER BY "totalScore" DESC, "penaltySeconds" ASC, "problemsSolved" DESC
  `;

  const { rows } = await pgPool.query(query, [contestId]);

  return rows.map((r, index) => ({
    rank: index + 1,
    userId: r.userId,
    username: r.username,
    name: r.name,
    problemsSolved: r.problemsSolved,
    totalScore: r.totalScore,
    penaltySeconds: r.penaltySeconds,
    submissionsCount: r.submissionsCount,
  }));
}

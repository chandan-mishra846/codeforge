import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUserByEmail, getUserById, getUserDetailedStats } from '@rce/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'codeforge_secret_key_2026';

// POST /api/v1/auth/register - User Registration
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const uName = username || email.split('@')[0];
    const newUser = await createUser({
      name,
      username: uName,
      email,
      passwordHash,
      role: 'USER',
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error('[Auth API] Registration failed:', error);
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
});

// POST /api/v1/auth/login - User Login & Role Fetch from Database
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userWithPass = await getUserByEmail(email);
    if (!userWithPass || !userWithPass.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, userWithPass.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Role is fetched directly from database row
    const userRole = userWithPass.role || 'USER';

    const token = jwt.sign(
      { userId: userWithPass.id, email: userWithPass.email, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userProfile = {
      id: userWithPass.id,
      name: userWithPass.name,
      username: userWithPass.username,
      email: userWithPass.email,
      role: userRole,
      currentStreak: userWithPass.currentStreak || 0,
      questionsSolved: userWithPass.questionsSolved || 0,
      lastSubmissionDate: userWithPass.lastSubmissionDate || null,
      createdAt: userWithPass.createdAt,
    };

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userProfile,
    });
  } catch (error: any) {
    console.error('[Auth API] Login failed:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// GET /api/v1/auth/me - Fetch Logged In User Profile & Stats
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const detailedStats = await getUserDetailedStats(req.user.id);

    res.json({
      success: true,
      user: {
        ...user,
        questionsSolved: detailedStats.totalSolved,
        currentStreak: detailedStats.currentStreak,
      },
      stats: detailedStats,
    });
  } catch (error: any) {
    console.error('[Auth API] Fetch profile failed:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

// GET /api/v1/auth/stats - Get Detailed Difficulty Breakdown & Streaks
authRouter.get('/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const detailedStats = await getUserDetailedStats(req.user.id);
    res.json({
      success: true,
      stats: detailedStats,
    });
  } catch (error: any) {
    console.error('[Auth API] Fetch stats failed:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

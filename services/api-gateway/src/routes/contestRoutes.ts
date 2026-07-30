import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  getAllContests,
  getContestBySlug,
  registerUserForContest,
  getContestLeaderboard,
} from '@rce/database';

export const contestRouter = Router();

// GET /api/v1/contests - Fetch all contests with server timestamp for countdown sync
contestRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req.query.userId as string);
    const contests = await getAllContests(userId);
    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      count: contests.length,
      contests,
    });
  } catch (error: any) {
    console.error('[Contest API] Error fetching contests:', error);
    res.status(500).json({ error: 'Failed to fetch contests', details: error.message });
  }
});

// GET /api/v1/contests/:slug - Get contest details, problem list A/B/C, and user solved status
contestRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = (req as any).user?.id || (req.query.userId as string);

    const contest = await getContestBySlug(slug, userId);
    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      contest,
    });
  } catch (error: any) {
    console.error('[Contest API] Error fetching contest details:', error);
    res.status(500).json({ error: 'Failed to fetch contest details', details: error.message });
  }
});

// POST /api/v1/contests/:id/register - Register user for contest
contestRouter.post('/:id/register', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to register for contest.' });
    }

    await registerUserForContest(id, userId);
    res.json({ success: true, message: 'Successfully registered for contest!' });
  } catch (error: any) {
    console.error('[Contest API] Error registering for contest:', error);
    res.status(500).json({ error: 'Failed to register for contest', details: error.message });
  }
});

// GET /api/v1/contests/:id/leaderboard - Fetch real-time contest leaderboard
contestRouter.get('/:id/leaderboard', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leaderboard = await getContestLeaderboard(id);

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error: any) {
    console.error('[Contest API] Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch contest leaderboard', details: error.message });
  }
});

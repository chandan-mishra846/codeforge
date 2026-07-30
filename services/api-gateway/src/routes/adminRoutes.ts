import { Router, Response } from 'express';
import { authenticate, adminOnly, AuthenticatedRequest } from '../middleware/auth';
import {
  getAllProblems,
  getProblemById,
  createProblemWithTestCases,
  updateProblemWithTestCases,
  deleteProblem,
  getAllUsers,
  getUserById,
  getUserSubmissionHistory,
  getUserSolvedProblemIds,
  updateUserRole,
  deleteUserById,
  createContest,
  updateContest,
  deleteContest,
  getContestBySlug,
} from '@rce/database';

export const adminRouter = Router();

// Apply authentication and RBAC admin guard to all admin routes
adminRouter.use(authenticate, adminOnly);

// ==========================================
// Admin User Management Routes
// ==========================================

// GET /api/v1/admin/users - List all registered users
adminRouter.get('/users', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    console.error('[Admin API] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// GET /api/v1/admin/users/:id - Get complete profile, submission history, and solved problems for user
adminRouter.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const submissions = await getUserSubmissionHistory(id);
    const solvedProblemIds = await getUserSolvedProblemIds(id);

    res.json({
      success: true,
      user,
      submissions,
      solvedProblemIds,
    });
  } catch (error: any) {
    console.error('[Admin API] Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

// PUT /api/v1/admin/users/:id/role - Update user role (ADMIN / USER)
adminRouter.put('/users/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'ADMIN' && role !== 'USER')) {
      return res.status(400).json({ error: 'Role must be either ADMIN or USER.' });
    }

    const updatedUser = await updateUserRole(id, role);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User role updated successfully.', user: updatedUser });
  } catch (error: any) {
    console.error('[Admin API] Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role', details: error.message });
  }
});

// DELETE /api/v1/admin/users/:id - Delete a user
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting main system admin
    if (id === '00000000-0000-0000-0000-000000000001') {
      return res.status(400).json({ error: 'System Admin account cannot be deleted.' });
    }

    const deleted = await deleteUserById(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User account deleted successfully.' });
  } catch (error: any) {
    console.error('[Admin API] Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// ==========================================
// Admin Problem Management Routes
// ==========================================

// GET /api/v1/admin/problems - List all problems including test case counts
adminRouter.get('/problems', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const problems = await getAllProblems(true);
    res.json({ success: true, count: problems.length, problems });
  } catch (error: any) {
    console.error('[Admin API] Error fetching problems:', error);
    res.status(500).json({ error: 'Failed to fetch problems', details: error.message });
  }
});

// GET /api/v1/admin/problems/:id - Get specific problem with ALL test cases
adminRouter.get('/problems/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await getProblemById(id, true);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json({ success: true, problem });
  } catch (error: any) {
    console.error('[Admin API] Error fetching problem:', error);
    res.status(500).json({ error: 'Failed to fetch problem', details: error.message });
  }
});

// POST /api/v1/admin/problems - Create problem with constraints & topics
adminRouter.post('/problems', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, slug, description, difficulty, timeLimitMs, memoryLimitMb, constraints, topics, testCases } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields: title and description are required.' });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: 'At least one test case is required.' });
    }

    const newProblem = await createProblemWithTestCases(
      {
        title,
        slug,
        description,
        difficulty: difficulty || 'MEDIUM',
        timeLimitMs: timeLimitMs || 2000,
        memoryLimitMb: memoryLimitMb || 256,
        constraints,
        topics: Array.isArray(topics) ? topics : [],
      },
      testCases
    );

    res.status(201).json({
      success: true,
      message: 'Problem created successfully.',
      problem: newProblem,
    });
  } catch (error: any) {
    console.error('[Admin API] Error creating problem:', error);
    res.status(500).json({ error: 'Failed to create problem', details: error.message });
  }
});

// PUT /api/v1/admin/problems/:id - Update problem details, constraints, topics or test cases
adminRouter.put('/problems/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, description, difficulty, timeLimitMs, memoryLimitMb, constraints, topics, testCases } = req.body;

    const updated = await updateProblemWithTestCases(
      id,
      { title, slug, description, difficulty, timeLimitMs, memoryLimitMb, constraints, topics },
      testCases
    );

    if (!updated) {
      return res.status(404).json({ error: 'Problem not found for update' });
    }

    res.json({
      success: true,
      message: 'Problem updated successfully.',
      problem: updated,
    });
  } catch (error: any) {
    console.error('[Admin API] Error updating problem:', error);
    res.status(500).json({ error: 'Failed to update problem', details: error.message });
  }
});

// DELETE /api/v1/admin/problems/:id - Delete problem
adminRouter.delete('/problems/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProblem(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json({ success: true, message: 'Problem deleted successfully.' });
  } catch (error: any) {
    console.error('[Admin API] Error deleting problem:', error);
    res.status(500).json({ error: 'Failed to delete problem', details: error.message });
  }
});

// ==========================================
// Admin Contest Management Routes
// ==========================================

// POST /api/v1/admin/contests - Create a new contest
adminRouter.post('/contests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, slug, description, startTime, endTime, durationMinutes, visibility, rules, problemIds } = req.body;

    if (!title || !description || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: title, description, startTime, and endTime are required.' });
    }

    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: 'At least one problem must be selected for the contest.' });
    }

    const contest = await createContest(
      {
        title,
        slug,
        description,
        startTime,
        endTime,
        durationMinutes: durationMinutes || 120,
        visibility: visibility || 'PUBLIC',
        rules,
      },
      problemIds
    );

    res.status(201).json({
      success: true,
      message: 'Contest created successfully.',
      contest,
    });
  } catch (error: any) {
    console.error('[Admin API] Error creating contest:', error);
    res.status(500).json({ error: 'Failed to create contest', details: error.message });
  }
});

// PUT /api/v1/admin/contests/:id - Edit contest
adminRouter.put('/contests/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, description, startTime, endTime, durationMinutes, visibility, rules, problemIds } = req.body;

    const updated = await updateContest(
      id,
      { title, slug, description, startTime, endTime, durationMinutes, visibility, rules },
      problemIds
    );

    if (!updated) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    res.json({
      success: true,
      message: 'Contest updated successfully.',
      contest: updated,
    });
  } catch (error: any) {
    console.error('[Admin API] Error updating contest:', error);
    res.status(500).json({ error: 'Failed to update contest', details: error.message });
  }
});

// DELETE /api/v1/admin/contests/:id - Delete contest
adminRouter.delete('/contests/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteContest(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Contest not found' });
    }
    res.json({ success: true, message: 'Contest deleted successfully.' });
  } catch (error: any) {
    console.error('[Admin API] Error deleting contest:', error);
    res.status(500).json({ error: 'Failed to delete contest', details: error.message });
  }
});

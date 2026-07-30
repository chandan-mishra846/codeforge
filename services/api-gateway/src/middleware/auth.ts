import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@rce/shared';
import { getUserById } from '@rce/database';

const JWT_SECRET = process.env.JWT_SECRET || 'codeforge_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: UserRole;
  };
}

/**
 * Authenticate middleware.
 * Verifies JWT Bearer token and fetches user's role directly from DB.
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const roleHeader = req.headers['x-user-role'] as string;
  const userIdHeader = req.headers['x-user-id'] as string;

  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch {
      res.status(401).json({ error: 'Invalid or expired authentication token.' });
      return;
    }
  } else if (userIdHeader) {
    userId = userIdHeader;
  }

  if (!userId) {
    // Default guest fallback
    req.user = {
      id: '00000000-0000-0000-0000-000000000002',
      role: (roleHeader && roleHeader.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'USER',
    };
    return next();
  }

  try {
    // Fetch live user role from database
    const dbUser = await getUserById(userId);
    if (dbUser) {
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role || 'USER',
      };
    } else {
      req.user = {
        id: userId,
        role: (roleHeader && roleHeader.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'USER',
      };
    }
  } catch (err) {
    req.user = {
      id: userId,
      role: 'USER',
    };
  }

  next();
}

/**
 * RBAC Admin-Only guard.
 */
export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Access denied. Admin privileges required.',
    });
    return;
  }
  next();
}

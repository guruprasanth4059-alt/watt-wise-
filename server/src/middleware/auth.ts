import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JwtPayload, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Platform admin has superuser capability across role checks
    if (req.user.role === 'platform_admin' || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({ error: 'You do not have permission to perform this action.' });
  };
}

export function requireSociety(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // Platform admins can access or pass societyId as query or body
  if (req.user.role === 'platform_admin') {
    const targetSocietyId = (req.query.societyId as string) || req.body?.societyId || req.params?.societyId;
    if (targetSocietyId) {
      req.user.societyId = targetSocietyId;
    }
    next();
    return;
  }

  if (!req.user.societyId) {
    res.status(400).json({ error: 'User is not associated with an apartment society.' });
    return;
  }

  next();
}

/**
 * Society Data Isolation Guard (RLS Enforcement):
 * Ensures the target society matches the authenticated user's assigned society.
 */
export function getAuthorizedSocietyId(req: AuthenticatedRequest): string {
  if (!req.user) {
    throw new Error('Unauthorized');
  }

  if (req.user.role === 'platform_admin') {
    return (req.query.societyId as string) || req.body?.societyId || req.user.societyId || 'soc-green-valley-01';
  }

  if (!req.user.societyId) {
    throw new Error('User does not belong to any society');
  }

  return req.user.societyId;
}

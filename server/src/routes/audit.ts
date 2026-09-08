import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { getSocietyAuditLogs } from '../services/audit.js';

export const auditRouter = Router();

auditRouter.get('/', authenticateToken, requireRole('society_admin', 'platform_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const logs = getSocietyAuditLogs(societyId, Math.min(100, Math.max(1, limit)));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve audit log records.' });
  }
});

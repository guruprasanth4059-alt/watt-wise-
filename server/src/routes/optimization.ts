import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { getPeakManagementOverview } from '../services/optimizationEngine.js';

export const optimizationRouter = Router();
optimizationRouter.use(authenticateToken);

// GET /api/optimization/peak-management - Peak demand overview, coincidence, and strategies
optimizationRouter.get('/peak-management', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const overview = getPeakManagementOverview(societyId);
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch peak management overview.' });
  }
});

import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, getAuthorizedSocietyId } from '../middleware/auth.js';
import { calculateSocietyAnalytics, getCategoryBreakdown } from '../services/analytics.js';

export const analyticsRouter = Router();

// Main analytics summary
analyticsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const analytics = calculateSocietyAnalytics(societyId);
    res.json(analytics);
  } catch (err: any) {
    console.error('Analytics computation error:', err);
    res.status(500).json({ error: 'Something went wrong while loading your electricity data. Please try again.' });
  }
});

// Category-level breakdown (Common Areas)
analyticsRouter.get('/category-breakdown', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const period = req.query.period as string | undefined;
    const breakdown = getCategoryBreakdown(societyId, period);
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve common-area energy breakdown.' });
  }
});

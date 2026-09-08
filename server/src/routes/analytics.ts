import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, getAuthorizedSocietyId } from '../middleware/auth.js';
import { calculateSocietyAnalytics, getCategoryBreakdown, getNearRealTimeEnergySummary, getDataReconciliation } from '../services/analytics.js';

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

// Near-Real-Time energy summary (Phase 3)
analyticsRouter.get('/realtime', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const summary = getNearRealTimeEnergySummary(societyId);
    res.json(summary);
  } catch (err: any) {
    console.error('Real-time analytics error:', err);
    res.status(500).json({ error: 'Failed to load real-time energy summary.' });
  }
});

// Bill vs. Smart Meter data reconciliation
analyticsRouter.get('/reconciliation', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const reconciliation = getDataReconciliation(societyId);
    res.json(reconciliation);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute data reconciliation.' });
  }
});

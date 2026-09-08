import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  generateOpportunities,
  getOpportunities,
  convertOpportunityToRecommendation
} from '../services/opportunities.js';

export const opportunitiesRouter = Router();
opportunitiesRouter.use(authenticateToken);

// GET /api/opportunities - List prioritized opportunities
opportunitiesRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const list = generateOpportunities(societyId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch opportunities.' });
  }
});

// POST /api/opportunities/:id/convert - Convert opportunity to recommendation
opportunitiesRouter.post('/:id/convert', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    const userId = req.user?.userId || 'system';
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const rec = convertOpportunityToRecommendation(req.params.id, societyId, userId);
    res.status(201).json(rec);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to convert opportunity.' });
  }
});

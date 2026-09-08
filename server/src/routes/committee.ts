import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { generateCommitteeBriefing, getLatestCommitteeBriefing } from '../services/committee.js';

export const committeeRouter = Router();
committeeRouter.use(authenticateToken);

// GET /api/committee/briefing - Get latest briefing
committeeRouter.get('/briefing', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    let briefing = getLatestCommitteeBriefing(societyId);
    if (!briefing) {
      briefing = await generateCommitteeBriefing(societyId, req.user?.userId);
    }
    res.json(briefing);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch committee briefing.' });
  }
});

// POST /api/committee/generate - Force fresh briefing generation
committeeRouter.post('/generate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const briefing = await generateCommitteeBriefing(societyId, req.user?.userId);
    res.json(briefing);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Briefing generation failed.' });
  }
});

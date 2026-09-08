import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { askEnergyCopilot, getCopilotHistory } from '../services/copilot.js';

export const copilotRouter = Router();
copilotRouter.use(authenticateToken);

// GET /api/copilot/history - Get chat messages
copilotRouter.get('/history', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const sessionId = req.query.sessionId as string | undefined;
    const history = getCopilotHistory(societyId, sessionId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch Copilot history.' });
  }
});

// POST /api/copilot/ask - Ask question
copilotRouter.post('/ask', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = req.user?.societyId;
    const userId = req.user?.userId;
    if (!societyId || !userId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const { question, sessionId } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question string is required.' });
      return;
    }
    const reply = await askEnergyCopilot({
      societyId,
      userId,
      sessionId,
      question
    });
    res.json(reply);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Copilot query failed.' });
  }
});

// GET /api/copilot/prompts - Suggested starter prompts
copilotRouter.get('/prompts', (req: AuthenticatedRequest, res: Response): void => {
  res.json([
    { label: 'Cost Analysis', prompt: 'Why did our electricity cost increase this month?' },
    { label: 'Highest Load', prompt: 'Which equipment uses the most electricity in our society?' },
    { label: 'Peak Forecast', prompt: 'What is our expected peak demand this week and when will it occur?' },
    { label: 'Month-End Target', prompt: 'Are we likely to exceed last month\'s electricity consumption?' },
    { label: 'Top Opportunities', prompt: 'What should the management committee investigate first to lower bills?' },
    { label: 'Pump Schedule', prompt: 'How much electricity can we save by reducing pump runtime by 1 hour?' }
  ]);
});

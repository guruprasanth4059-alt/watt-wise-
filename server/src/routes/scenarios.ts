import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { runScenarioSimulation, getScenarioHistory } from '../services/scenarios.js';

export const scenariosRouter = Router();
scenariosRouter.use(authenticateToken);

// GET /api/scenarios/history - Past executed scenarios
scenariosRouter.get('/history', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const history = getScenarioHistory(societyId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch scenario history.' });
  }
});

// POST /api/scenarios/simulate - Run custom simulation
scenariosRouter.post('/simulate', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    const userId = req.user?.userId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const { title, scenarioType, parameters } = req.body;
    if (!scenarioType || !parameters) {
      res.status(400).json({ error: 'scenarioType and parameters are required.' });
      return;
    }
    const result = runScenarioSimulation(societyId, {
      title: title || 'Custom What-If Simulation',
      scenarioType,
      parameters,
      userId
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Scenario simulation failed.' });
  }
});

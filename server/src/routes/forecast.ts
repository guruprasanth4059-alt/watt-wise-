import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { generateSocietyForecast, getForecastAccuracyMetrics } from '../services/forecasting/forecastingEngine.js';

export const forecastRouter = Router();
forecastRouter.use(authenticateToken);

// GET /api/forecast - Get current society forecast summary
forecastRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const forecast = await generateSocietyForecast(societyId);
    res.json(forecast);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate forecast.' });
  }
});

// GET /api/forecast/accuracy - Model accuracy metrics
forecastRouter.get('/accuracy', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const metrics = getForecastAccuracyMetrics(societyId);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch accuracy metrics.' });
  }
});

// POST /api/forecast/recalculate - Force fresh forecast run
forecastRouter.post('/recalculate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const forecast = await generateSocietyForecast(societyId);
    res.json(forecast);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Recalculation failed.' });
  }
});

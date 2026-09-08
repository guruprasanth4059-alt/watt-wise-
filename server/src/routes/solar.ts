import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getSolarSummary,
  getSolarGenerationTrends,
  simulateSolarRoi,
  saveSolarSystem,
  recordSolarMeasurement
} from '../services/solar.js';

export const solarRouter = Router();
solarRouter.use(authenticateToken);

// GET /api/solar/summary - Solar performance summary & CUF
solarRouter.get('/summary', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const summary = getSolarSummary(societyId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch solar summary.' });
  }
});

// GET /api/solar/generation - Generation trends & day curves
solarRouter.get('/generation', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const days = Number(req.query.days) || 7;
    const trends = getSolarGenerationTrends(societyId, days);
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch generation trends.' });
  }
});

// POST /api/solar/simulate - 20-Year Solar ROI Simulator
solarRouter.post('/simulate', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const simulation = simulateSolarRoi(societyId, req.body);
    res.json(simulation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate solar ROI.' });
  }
});

// POST /api/solar/system - Configure or update solar system specs
solarRouter.post('/system', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const system = saveSolarSystem({
      societyId,
      ...req.body
    });
    res.json(system);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save solar system.' });
  }
});

// POST /api/solar/reading - Record solar telemetry reading
solarRouter.post('/reading', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    recordSolarMeasurement(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record solar measurement.' });
  }
});

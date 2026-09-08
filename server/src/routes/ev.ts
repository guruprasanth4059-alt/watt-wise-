import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getEVOptimizationSummary,
  getEVChargers,
  createEVCharger,
  getEVSessions,
  recordEVSession
} from '../services/ev.js';

export const evRouter = Router();
evRouter.use(authenticateToken);

// GET /api/ev/summary - EV Charging overview, peak impact & load shift opportunity
evRouter.get('/summary', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const summary = getEVOptimizationSummary(societyId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch EV summary.' });
  }
});

// GET /api/ev/chargers - List society EV chargers
evRouter.get('/chargers', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const chargers = getEVChargers(societyId);
    res.json(chargers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch chargers.' });
  }
});

// POST /api/ev/chargers - Register EV charger
evRouter.post('/chargers', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const charger = createEVCharger({
      societyId,
      ...req.body
    });
    res.status(201).json(charger);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register charger.' });
  }
});

// GET /api/ev/sessions - Recent charging sessions
evRouter.get('/sessions', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const limit = Number(req.query.limit) || 30;
    const sessions = getEVSessions(societyId, limit);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch EV sessions.' });
  }
});

// POST /api/ev/sessions - Record completed charging session
evRouter.post('/sessions', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const session = recordEVSession(req.body);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record session.' });
  }
});

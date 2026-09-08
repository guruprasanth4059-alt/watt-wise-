import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { simulateBatteryStorage } from '../services/storage.js';

export const storageRouter = Router();
storageRouter.use(authenticateToken);

// POST /api/storage/simulate - Run deterministic battery readiness simulation
storageRouter.post('/simulate', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const result = simulateBatteryStorage(societyId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate battery storage.' });
  }
});

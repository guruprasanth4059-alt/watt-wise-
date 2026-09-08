import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { getSocietyBenchmarks } from '../services/benchmarking.js';

export const benchmarksRouter = Router();
benchmarksRouter.use(authenticateToken);

// GET /api/benchmarks - Get peer benchmark comparison
benchmarksRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const result = getSocietyBenchmarks(societyId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch benchmarks.' });
  }
});

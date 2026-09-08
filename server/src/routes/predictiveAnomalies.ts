import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  evaluatePredictiveAnomalies,
  getSocietyPredictiveAnomalies,
  updatePredictiveAnomalyStatus
} from '../services/predictiveAnomalies.js';

export const predictiveAnomaliesRouter = Router();
predictiveAnomaliesRouter.use(authenticateToken);

// GET /api/predictive-anomalies - List early warning alerts
predictiveAnomaliesRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    // Evaluate leading indicators and return list
    const list = evaluatePredictiveAnomalies(societyId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch predictive anomalies.' });
  }
});

// PATCH /api/predictive-anomalies/:id/status - Update status
predictiveAnomaliesRouter.patch('/:id/status', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const { status, assigned_user } = req.body;
    updatePredictiveAnomalyStatus(req.params.id, societyId, status, assigned_user);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update status.' });
  }
});

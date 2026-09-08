import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { evaluateEquipmentHealth, getEquipmentHealthSignals } from '../services/equipmentHealth.js';

export const equipmentHealthRouter = Router();
equipmentHealthRouter.use(authenticateToken);

// GET /api/equipment-health - List equipment health signals
equipmentHealthRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const signals = evaluateEquipmentHealth(societyId);
    res.json(signals);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch equipment health signals.' });
  }
});

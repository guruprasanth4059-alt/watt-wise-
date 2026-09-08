import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { generateInvestmentReport } from '../services/investmentReport.js';

export const investmentReportRouter = Router();
investmentReportRouter.use(authenticateToken);

// GET /api/investment-report - Generate 10-Point Committee Investment Pack
investmentReportRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const report = generateInvestmentReport(societyId);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate investment report.' });
  }
});

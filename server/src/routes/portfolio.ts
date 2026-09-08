import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getEnergyPortfolioSummary,
  getEnergyTargets,
  createEnergyTarget,
  updateEnergyTarget,
  deleteEnergyTarget
} from '../services/portfolio.js';
import { getSustainabilityMetrics } from '../services/sustainability.js';

export const portfolioRouter = Router();
portfolioRouter.use(authenticateToken);

// GET /api/portfolio/summary - Executive portfolio summary, mix, costs, targets
portfolioRouter.get('/summary', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const summary = getEnergyPortfolioSummary(societyId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch portfolio summary.' });
  }
});

// GET /api/portfolio/sustainability - Detailed CEA carbon footprint metrics
portfolioRouter.get('/sustainability', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const days = Number(req.query.days) || 30;
    const metrics = getSustainabilityMetrics(societyId, days);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch sustainability metrics.' });
  }
});

// GET /api/portfolio/targets - Society energy strategy targets
portfolioRouter.get('/targets', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const targets = getEnergyTargets(societyId);
    res.json(targets);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch energy targets.' });
  }
});

// POST /api/portfolio/targets - Create energy target
portfolioRouter.post('/targets', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const target = createEnergyTarget({
      societyId,
      ...req.body
    });
    res.status(201).json(target);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create energy target.' });
  }
});

// PUT /api/portfolio/targets/:id - Update target status or progress
portfolioRouter.put('/targets/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const updated = updateEnergyTarget(req.params.id, societyId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Target not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update energy target.' });
  }
});

// DELETE /api/portfolio/targets/:id - Delete target
portfolioRouter.delete('/targets/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    deleteEnergyTarget(req.params.id, societyId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete target.' });
  }
});

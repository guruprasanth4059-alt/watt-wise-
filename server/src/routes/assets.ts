import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getSocietyAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getEnergyFlowMap
} from '../services/assets.js';

export const assetsRouter = Router();
assetsRouter.use(authenticateToken);

// GET /api/assets - List all assets for society
assetsRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const assets = getSocietyAssets(societyId);
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assets.' });
  }
});

// GET /api/assets/flow-map - Get dynamic Energy Flow Map tree
assetsRouter.get('/flow-map', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const flowMap = getEnergyFlowMap(societyId);
    res.json(flowMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to build flow map.' });
  }
});

// POST /api/assets - Register new asset
assetsRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const asset = createAsset({
      societyId,
      name: req.body.name,
      type: req.body.type,
      location: req.body.location,
      meterId: req.body.meterId,
      ratedKw: Number(req.body.ratedKw) || 0,
      ratedVoltage: req.body.ratedVoltage ? Number(req.body.ratedVoltage) : undefined,
      ratedCurrent: req.body.ratedCurrent ? Number(req.body.ratedCurrent) : undefined,
      powerFactorRating: req.body.powerFactorRating ? Number(req.body.powerFactorRating) : undefined,
      efficiencyClass: req.body.efficiencyClass,
      operatingHours: req.body.operatingHours,
      installationDate: req.body.installationDate,
      status: req.body.status
    });
    res.status(201).json(asset);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create asset.' });
  }
});

// PUT /api/assets/:id - Update asset
assetsRouter.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const updated = updateAsset(req.params.id, societyId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update asset.' });
  }
});

// DELETE /api/assets/:id - Deactivate asset
assetsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const societyId = req.user?.societyId;
    if (!societyId) {
      res.status(400).json({ error: 'User does not belong to a society.' });
      return;
    }
    const success = deleteAsset(req.params.id, societyId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete asset.' });
  }
});

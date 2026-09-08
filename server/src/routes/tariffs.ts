import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { getActiveSocietyTariff, saveSocietyTariff } from '../services/tariffEngine.js';
import { logAuditEvent } from '../services/audit.js';

export const tariffsRouter = Router();

// Get active electricity tariff for society
tariffsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const tariff = getActiveSocietyTariff(societyId);
    res.json(tariff || {
      name: 'Default Common Area Tariff (Unconfigured)',
      rate_type: 'fixed',
      rate_per_kwh: 8.15,
      configuration: {},
      is_active: 0,
      source: 'default_fallback'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load tariff.' });
  }
});

// Update or set electricity tariff (Society Admin only)
tariffsRouter.post('/', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { name, rate_type, rate_per_kwh, configuration, effective_from, effective_to } = req.body;

    if (!name || rate_per_kwh === undefined || isNaN(rate_per_kwh)) {
      res.status(400).json({ error: 'Tariff name and valid rate per kWh are required.' });
      return;
    }

    const updated = saveSocietyTariff({
      societyId,
      name,
      rateType: rate_type || 'fixed',
      ratePerKwh: parseFloat(rate_per_kwh),
      configuration,
      effectiveFrom: effective_from,
      effectiveTo: effective_to,
      source: 'user_entered'
    });

    logAuditEvent({
      societyId,
      userId: req.user!.userId,
      eventType: 'bill_verified',
      entityType: 'society',
      entityId: updated.id,
      metadata: { action: 'tariff_updated', rate_per_kwh, rate_type }
    });

    res.json({ message: 'Electricity tariff updated successfully.', tariff: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update tariff.' });
  }
});

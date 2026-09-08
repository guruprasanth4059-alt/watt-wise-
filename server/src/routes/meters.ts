import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Meter } from '../types/index.js';
import { providerRegistry } from '../services/providers/registry.js';
import { connectMeterToProvider, syncMeterData, disconnectMeter, getMeterConnectionHealth } from '../services/ingestion.js';

export const metersRouter = Router();

// List available smart-meter / energy providers
metersRouter.get('/providers', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const providers = providerRegistry.getAll();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list providers.' });
  }
});

// List all meters for the society with connection metadata
metersRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const meters = query<any>(
      `SELECT m.*, 
              mc.provider, 
              COALESCE(mc.status, m.connection_status, 'not_connected') as connection_status,
              mc.last_sync_at,
              mc.records_received,
              mc.last_error_message
       FROM meters m
       LEFT JOIN meter_connections mc ON m.id = mc.meter_id
       WHERE m.society_id = ? 
       ORDER BY m.created_at ASC`,
      [societyId]
    );
    res.json(meters);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load meters.' });
  }
});

// Create new meter (Society Admin only)
metersRouter.post('/', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { name, meter_number, type, building, area, parent_meter_id, category, data_source } = req.body;

    if (!name || !meter_number || !type) {
      res.status(400).json({ error: 'Meter name, meter number, and meter type are required.' });
      return;
    }

    const meterId = `meter-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO meters (id, society_id, name, meter_number, type, building, area, parent_meter_id, category, data_source, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        meterId, 
        societyId, 
        name.trim(), 
        meter_number.trim(), 
        type, 
        building || null, 
        area || null,
        parent_meter_id || null,
        category || type,
        data_source || 'manual'
      ]
    );

    const newMeter = queryOne<Meter>('SELECT * FROM meters WHERE id = ?', [meterId]);
    res.status(201).json({ message: 'Meter created successfully.', meter: newMeter });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add meter.' });
  }
});

// Update or toggle meter
metersRouter.put('/:id', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { name, meter_number, type, building, area, parent_meter_id, category, is_active } = req.body;

    const existing = queryOne<Meter>('SELECT id FROM meters WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!existing) {
      res.status(404).json({ error: 'Meter not found.' });
      return;
    }

    execute(
      `UPDATE meters 
       SET name = COALESCE(?, name),
           meter_number = COALESCE(?, meter_number),
           type = COALESCE(?, type),
           building = COALESCE(?, building),
           area = COALESCE(?, area),
           parent_meter_id = COALESCE(?, parent_meter_id),
           category = COALESCE(?, category),
           is_active = COALESCE(?, is_active)
       WHERE id = ? AND society_id = ?`,
      [name, meter_number, type, building, area, parent_meter_id, category, is_active !== undefined ? (is_active ? 1 : 0) : null, id, societyId]
    );

    const updated = queryOne<Meter>('SELECT * FROM meters WHERE id = ?', [id]);
    res.json({ message: 'Meter updated.', meter: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update meter.' });
  }
});

// Connect meter to smart meter provider
metersRouter.post('/:id/connect', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { providerId, externalMeterId, config } = req.body;

    if (!providerId) {
      res.status(400).json({ error: 'Provider ID is required.' });
      return;
    }

    const connection = await connectMeterToProvider({
      societyId,
      meterId: id,
      providerId,
      externalMeterId,
      config,
      userId: req.user!.userId
    });

    res.json({ message: 'Meter connected to energy provider successfully.', connection });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to connect meter.' });
  }
});

// Trigger synchronization for a meter
metersRouter.post('/:id/sync', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { daysBack } = req.body;

    const result = await syncMeterData({
      societyId,
      meterId: id,
      daysBack: daysBack ? parseInt(daysBack, 10) : 7,
      userId: req.user!.userId
    });

    res.json({ message: 'Meter synchronization completed.', result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Meter sync failed.' });
  }
});

// Disconnect meter from provider
metersRouter.post('/:id/disconnect', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    disconnectMeter(societyId, id, req.user!.userId);
    res.json({ message: 'Meter disconnected. Historical data preserved.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to disconnect meter.' });
  }
});

// Get connection health and latency
metersRouter.get('/:id/health', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    const health = getMeterConnectionHealth(societyId, id);
    if (!health) {
      res.status(404).json({ error: 'No connection record found for meter.' });
      return;
    }
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get connection health.' });
  }
});

// Query interval measurements for charts
metersRouter.get('/:id/measurements', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const timeframe = (req.query.timeframe as string) || '24h';

    let timeFilter = "datetime('now', '-24 hours')";
    if (timeframe === '7d') timeFilter = "datetime('now', '-7 days')";
    else if (timeframe === '30d') timeFilter = "datetime('now', '-30 days')";

    const measurements = query<any>(
      `SELECT timestamp, energy_kwh, demand_kw, voltage, current, power_factor, source, quality_status
       FROM meter_measurements
       WHERE society_id = ? AND meter_id = ? AND timestamp >= ${timeFilter}
       ORDER BY timestamp ASC`,
      [societyId, id]
    );

    res.json({
      meterId: id,
      timeframe,
      count: measurements.length,
      measurements
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to query measurements.' });
  }
});

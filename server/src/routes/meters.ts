import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Meter } from '../types/index.js';

export const metersRouter = Router();

// List all meters for the society
metersRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const meters = query<Meter>(
      'SELECT * FROM meters WHERE society_id = ? ORDER BY created_at ASC',
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
    const { name, meter_number, type, building, area } = req.body;

    if (!name || !meter_number || !type) {
      res.status(400).json({ error: 'Meter name, meter number, and meter type are required.' });
      return;
    }

    const meterId = `meter-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO meters (id, society_id, name, meter_number, type, building, area, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [meterId, societyId, name.trim(), meter_number.trim(), type, building || null, area || null]
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
    const { name, meter_number, type, building, area, is_active } = req.body;

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
           is_active = COALESCE(?, is_active)
       WHERE id = ? AND society_id = ?`,
      [name, meter_number, type, building, area, is_active !== undefined ? (is_active ? 1 : 0) : null, id, societyId]
    );

    const updated = queryOne<Meter>('SELECT * FROM meters WHERE id = ?', [id]);
    res.json({ message: 'Meter updated.', meter: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update meter.' });
  }
});

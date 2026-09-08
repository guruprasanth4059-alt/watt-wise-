import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Society } from '../types/index.js';

export const societiesRouter = Router();

// Get society details for currently logged-in user
societiesRouter.get('/current', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);

    if (!society) {
      res.status(404).json({ error: 'Society record not found.' });
      return;
    }

    res.json({
      ...society,
      facilities: JSON.parse((society.facilities as any) || '[]')
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve society information.' });
  }
});

// Update society details (Society Admin only)
societiesRouter.put('/current', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { name, location, city, apartments, buildings, floors, facilities } = req.body;

    if (!name || !apartments) {
      res.status(400).json({ error: 'Society name and apartment count are required.' });
      return;
    }

    const facilitiesJson = Array.isArray(facilities) ? JSON.stringify(facilities) : '[]';

    execute(
      `UPDATE societies 
       SET name = ?, location = ?, city = ?, apartments = ?, buildings = ?, floors = ?, facilities = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        name.trim(),
        location || '',
        city || '',
        parseInt(apartments, 10),
        parseInt(buildings || '1', 10),
        parseInt(floors || '0', 10),
        facilitiesJson,
        societyId
      ]
    );

    const updated = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);

    res.json({
      message: 'Society information updated successfully.',
      society: updated ? { ...updated, facilities: JSON.parse((updated.facilities as any) || '[]') } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update society information.' });
  }
});

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { User, UserRole } from '../types/index.js';

export const usersRouter = Router();

// 1. List all users belonging to society
usersRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const users = query<User>(
      `SELECT id, name, email, role, society_id, phone, status, created_at 
       FROM users 
       WHERE society_id = ? 
       ORDER BY created_at ASC`,
      [societyId]
    );

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// 2. Add new user to society (Society Admin only)
usersRouter.post('/', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'Name, email, password, and role are required.' });
      return;
    }

    const validRoles: UserRole[] = ['society_admin', 'committee_member', 'resident'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid user role specified.' });
      return;
    }

    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const userId = `user-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO users (id, name, email, password_hash, role, society_id, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [userId, name.trim(), email.toLowerCase().trim(), passwordHash, role, societyId, phone || null]
    );

    const created = queryOne('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ?', [userId]);
    res.status(201).json({ message: 'User added successfully.', user: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// 3. Change user role (Society Admin only, cannot change own role)
usersRouter.put('/:id/role', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user!.userId) {
      res.status(400).json({ error: 'You cannot change your own role to prevent accidental lockout.' });
      return;
    }

    const validRoles: UserRole[] = ['society_admin', 'committee_member', 'resident'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }

    const user = queryOne('SELECT id FROM users WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!user) {
      res.status(404).json({ error: 'User not found in this society.' });
      return;
    }

    execute('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?', [role, id]);

    res.json({ message: 'User role updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// 4. Deactivate user (Society Admin only, cannot deactivate self)
usersRouter.put('/:id/status', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'inactive'

    if (id === req.user!.userId) {
      res.status(400).json({ error: 'You cannot deactivate your own account.' });
      return;
    }

    const user = queryOne('SELECT id FROM users WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    execute('UPDATE users SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [status === 'inactive' ? 'inactive' : 'active', id]);

    res.json({ message: `User account is now ${status}.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

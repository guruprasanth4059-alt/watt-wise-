import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, query, queryOne, execute, transaction } from '../database/db.js';
import { config } from '../config/index.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { User, Society, JwtPayload } from '../types/index.js';

export const authRouter = Router();

function generateToken(user: { id: string; email: string; role: any; society_id: string | null }): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    societyId: user.society_id
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

// 1. Multi-Step Registration / Society Onboarding
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      phone,
      societyName,
      location,
      city,
      apartments,
      buildings,
      floors,
      facilities
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    if (!societyName) {
      res.status(400).json({ error: 'Society name is required.' });
      return;
    }

    const existing = queryOne<User>('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const societyId = `soc-${uuidv4().slice(0, 8)}`;
    const userId = `user-${uuidv4().slice(0, 8)}`;
    const facilityList = Array.isArray(facilities) ? facilities : ['Water Pumps', 'Common Lighting', 'Elevators'];

    // Execute atomic creation
    transaction(() => {
      // 1. Create Society
      execute(
        `INSERT INTO societies (id, name, location, city, apartments, buildings, floors, facilities, setup_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          societyId,
          societyName.trim(),
          location || 'City Center',
          city || 'Bengaluru',
          parseInt(apartments || '100', 10),
          parseInt(buildings || '2', 10),
          parseInt(floors || '8', 10),
          JSON.stringify(facilityList)
        ]
      );

      // 2. Create Society Admin User
      execute(
        `INSERT INTO users (id, name, email, password_hash, role, society_id, phone, status)
         VALUES (?, ?, ?, ?, 'society_admin', ?, ?, 'active')`,
        [userId, name.trim(), email.toLowerCase().trim(), passwordHash, societyId, phone || null]
      );

      // 3. Create Default Main Meter
      const meterId = `meter-${uuidv4().slice(0, 8)}`;
      execute(
        `INSERT INTO meters (id, society_id, name, meter_number, type, building, area)
         VALUES (?, ?, 'Main Common Area Panel', ?, 'common_area', 'Main Substation', 'Common Facilities')`,
        [meterId, societyId, `BESCOM-${Math.floor(100000 + Math.random() * 900000)}`]
      );

      // 4. Create 3-Month Free Pilot Subscription
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 3);

      execute(
        `INSERT INTO subscriptions (id, society_id, plan, status, trial_start, trial_end)
         VALUES (?, ?, 'pilot', 'trial', ?, ?)`,
        [`sub-${uuidv4().slice(0, 8)}`, societyId, now.toISOString().slice(0, 10), trialEnd.toISOString().slice(0, 10)]
      );

      // 5. Welcome Notification
      execute(
        `INSERT INTO notifications (id, society_id, user_id, title, message, type, link)
         VALUES (?, ?, ?, 'Welcome to WattWise!', 'Your 3-month free pilot is active. Start by uploading your first electricity bill to unlock energy insights.', 'bill_verification', '/bills')`,
        [`notif-${uuidv4().slice(0, 8)}`, societyId, userId]
      );
    });

    const user = queryOne<User>('SELECT id, name, email, role, society_id, phone, status FROM users WHERE id = ?', [userId]);
    const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);

    const token = generateToken(user!);

    res.status(201).json({
      message: 'Society and account registered successfully.',
      token,
      user,
      society: society ? { ...society, facilities: JSON.parse(society.facilities as any || '[]') } : null
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create society account. Please check details and try again.' });
  }
});

// 2. Login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = queryOne<User>('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Your account is currently deactivated. Please contact your society administrator.' });
      return;
    }

    let society: any = null;
    if (user.society_id) {
      const soc = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [user.society_id]);
      if (soc) {
        society = { ...soc, facilities: JSON.parse(soc.facilities as any || '[]') };
      }
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;

    res.json({
      message: 'Login successful.',
      token,
      user: safeUser,
      society
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong during sign in. Please try again.' });
  }
});

// 3. Demo Quick Login (One-click access)
authRouter.post('/demo-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body; // 'admin' | 'committee' | 'resident' | 'platform_admin'

    let targetEmail = 'president@greenvalley.com';
    if (role === 'platform_admin') {
      targetEmail = 'admin@wattwise.com';
    } else if (role === 'committee') {
      targetEmail = 'treasurer@greenvalley.com';
    } else if (role === 'resident') {
      targetEmail = 'resident@greenvalley.com';
    }

    const user = queryOne<User>('SELECT * FROM users WHERE email = ?', [targetEmail]);
    if (!user) {
      res.status(404).json({ error: 'Demo user not found. Please ensure database is seeded.' });
      return;
    }

    let society: any = null;
    if (user.society_id) {
      const soc = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [user.society_id]);
      if (soc) {
        society = { ...soc, facilities: JSON.parse(soc.facilities as any || '[]') };
      }
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;

    res.json({
      message: `Signed in as Demo ${user.role}.`,
      token,
      user: safeUser,
      society,
      isDemo: true
    });
  } catch (err: any) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Failed to authenticate demo user.' });
  }
});

// 4. Current User Session Details
authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = queryOne<User>(
      'SELECT id, name, email, role, society_id, phone, status, created_at FROM users WHERE id = ?',
      [req.user!.userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User session not found.' });
      return;
    }

    let society: any = null;
    if (user.society_id) {
      const soc = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [user.society_id]);
      if (soc) {
        society = { ...soc, facilities: JSON.parse(soc.facilities as any || '[]') };
      }
    }

    res.json({ user, society });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

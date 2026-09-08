import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute } from '../database/db.js';
import { PilotRequest } from '../types/index.js';

export const pilotsRouter = Router();

// Public route to submit a pilot request
pilotsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, society_name, email, phone, city, apartments, message } = req.body;

    if (!name || !society_name || !email || !phone || !city) {
      res.status(400).json({ error: 'Name, society name, email, phone, and city are required.' });
      return;
    }

    const id = `pilot-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO pilot_requests (id, name, society_name, email, phone, city, apartments, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        id,
        name.trim(),
        society_name.trim(),
        email.toLowerCase().trim(),
        phone.trim(),
        city.trim(),
        parseInt(apartments || '100', 10),
        message || null
      ]
    );

    res.status(201).json({
      message: 'Thank you for your interest! The WattWise team will contact your RWA within 24 hours to initiate your 3-month free pilot.'
    });
  } catch (err: any) {
    console.error('Pilot request submission error:', err);
    res.status(500).json({ error: 'Failed to submit pilot request. Please try again.' });
  }
});

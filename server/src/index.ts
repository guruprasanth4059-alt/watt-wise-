import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config/index.js';
import { initializeDatabase } from './database/db.js';
import { seedDatabase } from './database/seed.js';

// Route imports
import { authRouter } from './routes/auth.js';
import { societiesRouter } from './routes/societies.js';
import { metersRouter } from './routes/meters.js';
import { billsRouter } from './routes/bills.js';
import { analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { savingsRouter } from './routes/savings.js';
import { reportsRouter } from './routes/reports.js';
import { notificationsRouter } from './routes/notifications.js';
import { usersRouter } from './routes/users.js';
import { pilotsRouter } from './routes/pilots.js';
import { adminRouter } from './routes/admin.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { pilotRouter } from './routes/pilot.js';
import { auditRouter } from './routes/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize and seed database
try {
  initializeDatabase();
  seedDatabase();
} catch (err) {
  console.error('Database initialization error:', err);
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
app.use('/uploads', express.static(config.uploadDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/societies', societiesRouter);
app.use('/api/meters', metersRouter);
app.use('/api/bills', billsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/pilots', pilotsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/pilot', pilotRouter);
app.use('/api/audit-logs', auditRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'WattWise API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Production Client serving
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized error handler - clean, user-friendly errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  const message = status === 500
    ? 'Something went wrong while loading your electricity data. Please try again.'
    : err.message || 'An unexpected error occurred.';
  res.status(status).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`⚡ WattWise Backend Server running on http://localhost:${config.port}`);
});

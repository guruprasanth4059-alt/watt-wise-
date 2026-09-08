import { Router, Response } from 'express';
import { queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Subscription } from '../types/index.js';

export const subscriptionsRouter = Router();

// Get subscription status for society
subscriptionsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    let sub = queryOne<Subscription>('SELECT * FROM subscriptions WHERE society_id = ?', [societyId]);

    if (!sub) {
      // Default to free pilot if missing
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 3);

      execute(
        `INSERT INTO subscriptions (id, society_id, plan, status, trial_start, trial_end)
         VALUES (?, ?, 'pilot', 'trial', ?, ?)`,
        [`sub-${societyId}`, societyId, now.toISOString().slice(0, 10), trialEnd.toISOString().slice(0, 10)]
      );

      sub = queryOne<Subscription>('SELECT * FROM subscriptions WHERE society_id = ?', [societyId]);
    }

    // Calculate days remaining
    let daysRemaining = 0;
    if (sub?.trial_end) {
      const diff = new Date(sub.trial_end).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    res.json({
      subscription: sub,
      daysRemaining,
      prototypeNote: 'Pricing shown is an initial pilot/prototype pricing model and may change.',
      plans: [
        {
          id: 'pilot',
          name: 'Free Pilot',
          price: '₹0',
          duration: '3 Months',
          description: 'Experience full common-area electricity intelligence with zero commitment.',
          features: [
            'Full Energy Dashboard',
            'Bill Extraction & History',
            'Sub-meter Consumption Analysis',
            'AI-Powered Insights',
            'Action & Savings Tracking',
            'Monthly Executive Reports',
            'Multi-Role Access (Admin, Committee, Resident)'
          ]
        },
        {
          id: 'basic',
          name: 'Basic Society',
          price: '₹1,999',
          period: 'per year',
          description: 'Essential common-area visibility for small and medium apartment societies.',
          features: [
            'Up to 3 Sub-Meters',
            'Monthly Bill Extraction',
            'Standard Energy Analytics',
            'Basic Recommendations',
            'Exportable Reports'
          ]
        },
        {
          id: 'pro',
          name: 'Pro Society',
          price: '₹4,999',
          period: 'per year',
          popular: true,
          description: 'Deep energy analytics, unlimited meters, and automated AI action recommendations.',
          features: [
            'Unlimited Sub-Meters',
            'Advanced AI-Powered Cause Analysis',
            'Automated Savings Verification',
            'Priority Recommendation Engine',
            'Executive PDF Reports with 1-Click Sharing',
            'Dedicated WhatsApp / Email Support'
          ]
        },
        {
          id: 'enterprise',
          name: 'Enterprise / Large Township',
          price: 'Custom',
          period: 'annual quote',
          description: 'For large townships, multiple phases, and federated RWA federations.',
          features: [
            'Multi-Campus Central Management',
            'Custom Tariff Slab Modeling',
            'Dedicated Energy Auditor Review',
            'Custom Sub-Meter Telemetry Integration Roadmap',
            'SLA Guarantee'
          ]
        }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve subscription status.' });
  }
});

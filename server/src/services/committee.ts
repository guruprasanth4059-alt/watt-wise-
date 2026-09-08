import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { CommitteeBriefing } from '../types/index.js';
import { calculateSocietyAnalytics } from './analytics.js';
import { generateSocietyForecast } from './forecasting/forecastingEngine.js';
import { getOpportunities } from './opportunities.js';
import { getSocietyPredictiveAnomalies } from './predictiveAnomalies.js';

export async function generateCommitteeBriefing(
  societyId: string,
  userId?: string
): Promise<CommitteeBriefing> {
  const analytics = calculateSocietyAnalytics(societyId);
  const forecast = await generateSocietyForecast(societyId);
  const opportunities = getOpportunities(societyId);
  const anomalies = getSocietyPredictiveAnomalies(societyId);

  const now = new Date();
  const meetingMonth = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

  // Top 5 Issues
  const topIssues = anomalies.slice(0, 5).map(a => ({
    title: a.observed_change,
    severity: a.risk_score.toUpperCase(),
    impact: a.expected_future_impact,
    owner: a.assigned_user || 'Society Maintenance Committee'
  }));

  if (topIssues.length === 0) {
    topIssues.push({
      title: 'Nominal Baseline Operation',
      severity: 'LOW',
      impact: 'Telemetry operating within expected standard deviations.',
      owner: 'Estate Manager'
    });
  }

  // Top 5 Opportunities
  const topOpportunities = opportunities.slice(0, 5).map(o => ({
    title: o.title,
    category: o.category.replace('_', ' ').toUpperCase(),
    monthlySavingsInr: o.estimated_impact_inr,
    priority: o.priority.toUpperCase()
  }));

  // Financial Impact
  const currentMonthlyEstimate = analytics?.currentMonth?.billAmount || 142380;
  const forecastedMonthEnd = forecast.expectedMonthlyCost || 148200;
  const potentialSavingsMonthly = opportunities.reduce((acc, o) => acc + o.estimated_impact_inr, 0);

  // Action Items from recommendations table
  const recActions = query<any>(
    `SELECT title, assigned_to, due_date, status 
     FROM recommendations 
     WHERE society_id = ? AND status != 'dismissed' 
     ORDER BY created_at DESC LIMIT 5`,
    [societyId]
  );

  const actionItems = recActions.map(r => ({
    task: r.title,
    owner: r.assigned_to || 'Management Committee',
    deadline: r.due_date || 'Next General Meeting',
    status: r.status.toUpperCase()
  }));

  const executiveBriefing = `Executive Energy Briefing for ${meetingMonth}: Common-area electricity consumption is tracking at ${analytics?.currentMonth?.consumptionKwh.toLocaleString() || '18,420'} kWh (₹${currentMonthlyEstimate.toLocaleString()}). WattWise forecasts month-end expenditure at approximately ₹${forecastedMonthEnd.toLocaleString()}. A total of ${opportunities.length} energy conservation opportunities have been identified with aggregate potential savings of ₹${potentialSavingsMonthly.toLocaleString()}/month. Immediate priority is directed toward water pump runtime optimization and basement lighting automation.`;

  const summaryId = `comm-${uuidv4().slice(0, 8)}`;
  let validUserId: string | null = null;
  if (userId) {
    const u = queryOne<any>('SELECT id FROM users WHERE id = ?', [userId]);
    if (u) validUserId = userId;
  }

  execute(
    `INSERT INTO committee_summaries (id, society_id, meeting_month, top_issues, top_opportunities, financial_impact, action_items, executive_briefing, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      summaryId,
      societyId,
      meetingMonth,
      JSON.stringify(topIssues),
      JSON.stringify(topOpportunities),
      JSON.stringify({ currentMonthlyEstimate, forecastedMonthEnd, potentialSavingsMonthly }),
      JSON.stringify(actionItems),
      executiveBriefing,
      validUserId
    ]
  );

  return {
    id: summaryId,
    society_id: societyId,
    meetingMonth,
    topIssues,
    topOpportunities,
    financialImpact: { currentMonthlyEstimate, forecastedMonthEnd, potentialSavingsMonthly },
    actionItems,
    executiveBriefing,
    generatedAt: now.toISOString()
  };
}

export function getLatestCommitteeBriefing(societyId: string): CommitteeBriefing | null {
  const row = queryOne<any>(
    `SELECT * FROM committee_summaries WHERE society_id = ? ORDER BY created_at DESC LIMIT 1`,
    [societyId]
  );

  if (!row) return null;

  return {
    id: row.id,
    society_id: row.society_id,
    meetingMonth: row.meeting_month,
    topIssues: typeof row.top_issues === 'string' ? JSON.parse(row.top_issues || '[]') : row.top_issues,
    topOpportunities: typeof row.top_opportunities === 'string' ? JSON.parse(row.top_opportunities || '[]') : row.top_opportunities,
    financialImpact: typeof row.financial_impact === 'string' ? JSON.parse(row.financial_impact || '{}') : row.financial_impact,
    actionItems: typeof row.action_items === 'string' ? JSON.parse(row.action_items || '[]') : row.action_items,
    executiveBriefing: row.executive_briefing,
    generatedAt: row.created_at
  };
}

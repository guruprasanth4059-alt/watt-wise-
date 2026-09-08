import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { EnergyProject, ProjectCategory, ProjectStatus } from '../types/index.js';
import { getActiveSocietyTariff } from './tariffEngine.js';

export function getProjects(societyId: string): EnergyProject[] {
  const rows = query<any>(
    `SELECT * FROM energy_projects WHERE society_id = ? ORDER BY created_at DESC`,
    [societyId]
  );
  return rows.map(mapProjectRow);
}

export function getProjectById(id: string, societyId: string): EnergyProject | null {
  const row = queryOne<any>(
    `SELECT * FROM energy_projects WHERE id = ? AND society_id = ?`,
    [id, societyId]
  );
  return row ? mapProjectRow(row) : null;
}

export function createProject(
  societyId: string,
  data: Partial<EnergyProject>
): EnergyProject {
  const id = `proj-${uuidv4().slice(0, 8)}`;
  const status = data.status || 'evaluating';
  const priority = data.priority || 'medium';
  const estCost = data.estimated_cost_inr || 0;
  const estSavInr = data.estimated_annual_savings_inr || 0;
  const estPaybackMonths =
    data.estimated_payback_months ??
    (estSavInr > 0 ? Math.round((estCost / (estSavInr / 12)) * 10) / 10 : 24);

  execute(
    `INSERT INTO energy_projects (
       id, society_id, name, category, status, priority, owner,
       estimated_cost_inr, actual_cost_inr,
       estimated_annual_savings_kwh, estimated_annual_savings_inr,
       observed_annual_savings_kwh, observed_annual_savings_inr,
       estimated_payback_months, start_date, completion_date,
       notes, assumptions, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      id,
      societyId,
      data.name || 'New Energy Project',
      data.category || 'solar',
      status,
      priority,
      data.owner || null,
      estCost,
      data.actual_cost_inr || 0,
      data.estimated_annual_savings_kwh || 0,
      estSavInr,
      data.observed_annual_savings_kwh || 0,
      data.observed_annual_savings_inr || 0,
      estPaybackMonths,
      data.start_date || null,
      data.completion_date || null,
      data.notes || null,
      JSON.stringify(data.assumptions || [])
    ]
  );

  return getProjectById(id, societyId)!;
}

export function updateProject(
  id: string,
  societyId: string,
  data: Partial<EnergyProject>
): EnergyProject | null {
  const existing = getProjectById(id, societyId);
  if (!existing) return null;

  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];

  const fields: Array<[string, any]> = [
    ['name', data.name],
    ['category', data.category],
    ['status', data.status],
    ['priority', data.priority],
    ['owner', data.owner],
    ['estimated_cost_inr', data.estimated_cost_inr],
    ['actual_cost_inr', data.actual_cost_inr],
    ['estimated_annual_savings_kwh', data.estimated_annual_savings_kwh],
    ['estimated_annual_savings_inr', data.estimated_annual_savings_inr],
    ['observed_annual_savings_kwh', data.observed_annual_savings_kwh],
    ['observed_annual_savings_inr', data.observed_annual_savings_inr],
    ['estimated_payback_months', data.estimated_payback_months],
    ['start_date', data.start_date],
    ['completion_date', data.completion_date],
    ['notes', data.notes]
  ];

  for (const [col, val] of fields) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      values.push(val);
    }
  }

  if (data.assumptions !== undefined) {
    sets.push('assumptions = ?');
    values.push(JSON.stringify(data.assumptions));
  }

  values.push(id, societyId);
  execute(`UPDATE energy_projects SET ${sets.join(', ')} WHERE id = ? AND society_id = ?`, values);
  return getProjectById(id, societyId);
}

export function deleteProject(id: string, societyId: string): boolean {
  execute(`DELETE FROM energy_projects WHERE id = ? AND society_id = ?`, [id, societyId]);
  return true;
}

export function simulateProjectProposal(
  societyId: string,
  category: ProjectCategory,
  params: { sizeUnit?: number; customCost?: number }
) {
  const tariff = getActiveSocietyTariff(societyId);
  const ratePerKwh = tariff?.ratePerKwh || 8.15;
  const size = Math.max(1, params.sizeUnit || 10);

  let capitalCost = 0;
  let annualSavingsKwh = 0;
  let annualSavingsInr = 0;
  let paybackMonths = 0;

  switch (category) {
    case 'solar':
      capitalCost = params.customCost || size * 48000;
      annualSavingsKwh = Math.round(size * 1400);
      annualSavingsInr = Math.round(annualSavingsKwh * ratePerKwh);
      break;
    case 'ev_smart_charging':
      capitalCost = params.customCost || size * 75000;
      annualSavingsKwh = Math.round(size * 3500);
      annualSavingsInr = Math.round(annualSavingsKwh * 3.0);
      break;
    case 'battery_storage':
      capitalCost = params.customCost || size * 24000;
      annualSavingsKwh = Math.round(size * 300);
      annualSavingsInr = Math.round(size * 0.5 * 300 * 12 + annualSavingsKwh * 4.0);
      break;
    case 'led_retrofit':
      capitalCost = params.customCost || size * 1200;
      annualSavingsKwh = Math.round(size * 219);
      annualSavingsInr = Math.round(annualSavingsKwh * ratePerKwh);
      break;
    case 'pump_upgrade':
      capitalCost = params.customCost || size * 8000;
      annualSavingsKwh = Math.round(size * 625);
      annualSavingsInr = Math.round(annualSavingsKwh * ratePerKwh);
      break;
    default:
      capitalCost = params.customCost || size * 10000;
      annualSavingsKwh = Math.round(size * 800);
      annualSavingsInr = Math.round(annualSavingsKwh * ratePerKwh);
      break;
  }

  paybackMonths = annualSavingsInr > 0 ? Math.round((capitalCost / (annualSavingsInr / 12)) * 10) / 10 : 99;

  return {
    category,
    sizeUnit: size,
    estimatedCostInr: capitalCost,
    estimatedAnnualSavingsKwh: annualSavingsKwh,
    estimatedAnnualSavingsInr: annualSavingsInr,
    estimatedPaybackMonths: paybackMonths,
    disclaimer: 'Simulation / Estimate — Not Guaranteed'
  };
}

function mapProjectRow(row: any): EnergyProject {
  let assumptions: string[] = [];
  if (row.assumptions) {
    try {
      assumptions = typeof row.assumptions === 'string' ? JSON.parse(row.assumptions) : row.assumptions;
    } catch {}
  }

  // Calculate variance if observed data exists
  let variancePercent: number | null = null;
  if (row.observed_annual_savings_inr > 0 && row.estimated_annual_savings_inr > 0) {
    variancePercent = Math.round(
      ((row.observed_annual_savings_inr - row.estimated_annual_savings_inr) /
        row.estimated_annual_savings_inr) *
        100
    );
  }

  return {
    id: row.id,
    society_id: row.society_id,
    name: row.name,
    category: row.category as ProjectCategory,
    status: row.status as ProjectStatus,
    priority: row.priority || 'medium',
    owner: row.owner,
    estimated_cost_inr: row.estimated_cost_inr || 0,
    actual_cost_inr: row.actual_cost_inr || 0,
    estimated_annual_savings_kwh: row.estimated_annual_savings_kwh || 0,
    estimated_annual_savings_inr: row.estimated_annual_savings_inr || 0,
    observed_annual_savings_kwh: row.observed_annual_savings_kwh || 0,
    observed_annual_savings_inr: row.observed_annual_savings_inr || 0,
    estimated_payback_months: row.estimated_payback_months,
    start_date: row.start_date,
    completion_date: row.completion_date,
    notes: row.notes,
    assumptions,
    variance_percent: variancePercent,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

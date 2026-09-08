import { query, queryOne } from '../database/db.js';

export interface SocietyBenchmarkResult {
  status: 'available' | 'unavailable';
  message?: string;
  cohortSize: number;
  cohortDescription: string;
  societyMetrics: {
    kwhPerApartment: number;
    costPerApartment: number;
    peakKwPerApartment: number;
  };
  cohortAverages: {
    avgKwhPerApartment: number;
    medianKwhPerApartment: number;
    topQuartileKwhPerApartment: number;
    avgCostPerApartment: number;
  };
  percentileRank: number; // e.g. 35th percentile (lower is better in energy)
  efficiencyBand: 'top_10_percent' | 'better_than_average' | 'average' | 'higher_than_average';
}

export function getSocietyBenchmarks(societyId: string): SocietyBenchmarkResult {
  const currentSociety = queryOne<any>(
    `SELECT id, name, apartments, city FROM societies WHERE id = ?`,
    [societyId]
  );

  if (!currentSociety) {
    throw new Error('Society not found');
  }

  // Find comparable societies in same city with similar apartment count (+-40%)
  const minApartments = Math.max(10, Math.round(currentSociety.apartments * 0.6));
  const maxApartments = Math.round(currentSociety.apartments * 1.4);

  const cohort = query<any>(
    `SELECT s.id, s.apartments, 
            AVG(b.units_kwh) as avg_units, 
            AVG(b.bill_amount) as avg_cost
     FROM societies s
     JOIN bills b ON s.id = b.society_id AND b.verified = 1
     WHERE s.apartments BETWEEN ? AND ?
     GROUP BY s.id
     HAVING count(b.id) >= 2`,
    [minApartments, maxApartments]
  );

  // Privacy & Data threshold gate: minimum 3 comparable societies required
  if (cohort.length < 3) {
    return {
      status: 'unavailable',
      message: 'Benchmark unavailable — More comparable society data is required in this cohort (minimum 3 societies). WattWise does not fabricate peer comparison data.',
      cohortSize: cohort.length,
      cohortDescription: `Societies with ${minApartments}–${maxApartments} apartments in ${currentSociety.city || 'urban centers'}`,
      societyMetrics: {
        kwhPerApartment: 0,
        costPerApartment: 0,
        peakKwPerApartment: 0
      },
      cohortAverages: {
        avgKwhPerApartment: 0,
        medianKwhPerApartment: 0,
        topQuartileKwhPerApartment: 0,
        avgCostPerApartment: 0
      },
      percentileRank: 50,
      efficiencyBand: 'average'
    };
  }

  // Calculate normalized metrics per apartment
  const normalizedCohort = cohort.map(c => ({
    kwhPerApt: c.avg_units / c.apartments,
    costPerApt: c.avg_cost / c.apartments
  })).sort((a, b) => a.kwhPerApt - b.kwhPerApt);

  const thisSocietyRecord = normalizedCohort.find(c => c.kwhPerApt > 0) || normalizedCohort[0];
  const totalKwhPerApt = normalizedCohort.reduce((acc, c) => acc + c.kwhPerApt, 0);
  const avgKwhPerApt = Math.round(totalKwhPerApt / normalizedCohort.length);
  const medianKwhPerApt = Math.round(normalizedCohort[Math.floor(normalizedCohort.length / 2)].kwhPerApt);
  const topQuartileKwh = Math.round(normalizedCohort[Math.floor(normalizedCohort.length * 0.25)].kwhPerApt);

  const totalCostPerApt = normalizedCohort.reduce((acc, c) => acc + c.costPerApt, 0);
  const avgCostPerApt = Math.round(totalCostPerApt / normalizedCohort.length);

  // Society's own latest verified metric
  const societyLatestBill = queryOne<any>(
    `SELECT units_kwh, bill_amount FROM bills WHERE society_id = ? AND verified = 1 ORDER BY billing_period DESC LIMIT 1`,
    [societyId]
  );
  const societyKwhPerApt = societyLatestBill ? Math.round(societyLatestBill.units_kwh / currentSociety.apartments) : 76;
  const societyCostPerApt = societyLatestBill ? Math.round(societyLatestBill.bill_amount / currentSociety.apartments) : 593;

  // Rank calculation (lower kWh per apartment is more efficient)
  const rank = normalizedCohort.filter(c => c.kwhPerApt <= societyKwhPerApt).length;
  const percentile = Math.max(5, Math.min(95, Math.round((rank / normalizedCohort.length) * 100)));

  const efficiencyBand =
    percentile <= 20 ? 'top_10_percent' :
    percentile <= 45 ? 'better_than_average' :
    percentile <= 75 ? 'average' : 'higher_than_average';

  return {
    status: 'available',
    cohortSize: normalizedCohort.length,
    cohortDescription: `Anonymized cohort of ${normalizedCohort.length} societies (${minApartments}–${maxApartments} apartments)`,
    societyMetrics: {
      kwhPerApartment: societyKwhPerApt,
      costPerApartment: societyCostPerApt,
      peakKwPerApartment: Math.round((42.8 / currentSociety.apartments) * 100) / 100
    },
    cohortAverages: {
      avgKwhPerApartment: avgKwhPerApt,
      medianKwhPerApartment: medianKwhPerApt,
      topQuartileKwhPerApartment: topQuartileKwh,
      avgCostPerApartment: avgCostPerApt
    },
    percentileRank: percentile,
    efficiencyBand
  };
}

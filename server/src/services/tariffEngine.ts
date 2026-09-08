import { query, queryOne, execute } from '../database/db.js';
import { Tariff } from '../types/index.js';

export function getActiveSocietyTariff(societyId: string): Tariff | null {
  const tariff = queryOne<any>(
    `SELECT * FROM tariffs WHERE society_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
    [societyId]
  );
  if (!tariff) return null;

  return {
    ...tariff,
    configuration: typeof tariff.configuration === 'string' ? JSON.parse(tariff.configuration || '{}') : tariff.configuration
  };
}

export function saveSocietyTariff(params: {
  societyId: string;
  name: string;
  rateType: 'fixed' | 'slab' | 'tou';
  ratePerKwh: number;
  configuration?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  source?: string;
}): Tariff {
  const tariffId = `tariff-${Date.now().toString(36)}`;

  // Deactivate existing active tariffs
  execute(`UPDATE tariffs SET is_active = 0 WHERE society_id = ?`, [params.societyId]);

  execute(
    `INSERT INTO tariffs (id, society_id, name, rate_type, rate_per_kwh, configuration, effective_from, effective_to, source, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      tariffId,
      params.societyId,
      params.name,
      params.rateType,
      params.ratePerKwh,
      JSON.stringify(params.configuration || {}),
      params.effectiveFrom || null,
      params.effectiveTo || null,
      params.source || 'user_entered'
    ]
  );

  return getActiveSocietyTariff(params.societyId)!;
}

export function calculateEstimatedRunningCost(
  kwh: number,
  societyId: string
): { cost: number; rateUsed: number; rateType: string; isEstimated: boolean } {
  const tariff = getActiveSocietyTariff(societyId);

  if (!tariff) {
    // Default Bangalore BESCOM commercial/common area baseline fallback
    const defaultRate = 8.15;
    return {
      cost: Math.round(kwh * defaultRate),
      rateUsed: defaultRate,
      rateType: 'fixed_default',
      isEstimated: true
    };
  }

  if (tariff.rate_type === 'slab') {
    const slabs = tariff.configuration?.slabs || [
      { upTo: 500, rate: 7.5 },
      { upTo: 2000, rate: 8.2 },
      { upTo: Infinity, rate: 8.9 }
    ];

    let remainingKwh = kwh;
    let totalCost = 0;
    let prevLimit = 0;

    for (const slab of slabs) {
      const slabUpTo = (slab.upTo === null || slab.upTo === undefined) ? Infinity : slab.upTo;
      const slabCapacity = slabUpTo - prevLimit;
      const kwhInSlab = Math.min(remainingKwh, slabCapacity);
      if (kwhInSlab > 0) {
        totalCost += kwhInSlab * slab.rate;
        remainingKwh -= kwhInSlab;
        prevLimit = slabUpTo;
      }
      if (remainingKwh <= 0) break;
    }

    return {
      cost: Math.round(totalCost),
      rateUsed: tariff.rate_per_kwh,
      rateType: 'slab',
      isEstimated: true
    };
  }

  // Fixed rate calculation
  const cost = Math.round(kwh * tariff.rate_per_kwh);
  return {
    cost,
    rateUsed: tariff.rate_per_kwh,
    rateType: tariff.rate_type,
    isEstimated: true
  };
}

import { query, queryOne } from '../database/db.js';
import { StorageSimulationInput, StorageSimulationResult } from '../types/index.js';
import { getActiveSocietyTariff } from './tariffEngine.js';

export function simulateBatteryStorage(
  societyId: string,
  input: StorageSimulationInput
): StorageSimulationResult & { dispatchProfile?: any[]; disclaimer: string } {
  const capacityKwh = Math.max(5, input.capacityKwh || 50);
  const powerRatingKw = Math.max(2, input.powerRatingKw || capacityKwh * 0.5);
  const roundTripEfficiency = Math.min(0.98, Math.max(0.7, (input.roundTripEfficiencyPct ? input.roundTripEfficiencyPct / 100 : 0.88)));
  const capexInr = input.capexInr || capacityKwh * 24000;
  const strategy = input.operatingStrategy || 'peak_shaving';

  // Usable battery headroom
  const usableKwh = capacityKwh * 0.85;

  // Peak reduction potential: limited by power rating and duration of peak window (~3 hours)
  const potentialPeakReductionKw = Math.min(powerRatingKw, Math.round((usableKwh / 3.0) * 10) / 10);

  // Monthly energy offset based on daily cycling
  const dailyOffsetKwh = usableKwh * roundTripEfficiency;
  const potentialGridEnergyOffsetKwhMonthly = Math.round(dailyOffsetKwh * 30);

  // Tariff calculation
  const tariff = getActiveSocietyTariff(societyId);
  const ratePerKwh = tariff?.ratePerKwh || 8.15;
  const peakSurchargeRate = 3.5; // ToU peak differential INR/kWh
  const demandChargeRatePerKw = 300; // INR per kW peak/month

  const monthlyDemandSavingsInr = potentialPeakReductionKw * demandChargeRatePerKw;
  const monthlyEnergySavingsInr = potentialGridEnergyOffsetKwhMonthly * peakSurchargeRate;
  const estimatedCostSavingsMonthlyInr = Math.round(monthlyDemandSavingsInr + monthlyEnergySavingsInr);
  const estimatedAnnualSavingsInr = estimatedCostSavingsMonthlyInr * 12;

  const estimatedPaybackYears =
    estimatedAnnualSavingsInr > 0 ? Math.round((capexInr / estimatedAnnualSavingsInr) * 10) / 10 : null;

  // 24-hr dispatch profile for visualization
  const dispatchProfile: Array<{
    hour: number;
    baseDemandKw: number;
    batteryFlowKw: number;
    netDemandKw: number;
    stateOfChargeKwh: number;
  }> = [];

  const defaultBaseCurve = [
    24, 22, 21, 20, 21, 23, 35, 48, 55, 52, 50, 48,
    46, 45, 46, 48, 52, 60, 78, 85, 82, 70, 52, 34
  ];

  let currentSoc = usableKwh * 0.3;
  for (let h = 0; h < 24; h++) {
    const baseDemand = defaultBaseCurve[h];
    let flowKw = 0;
    const isDischarge = h >= 18 && h <= 21;
    const isCharge = h >= 1 && h <= 4;

    if (isDischarge && currentSoc > usableKwh * 0.1) {
      flowKw = -Math.min(powerRatingKw, currentSoc);
      currentSoc = Math.max(0, currentSoc - Math.abs(flowKw));
    } else if (isCharge && currentSoc < usableKwh) {
      flowKw = Math.min(powerRatingKw, usableKwh - currentSoc);
      currentSoc = Math.min(usableKwh, currentSoc + flowKw * roundTripEfficiency);
    }

    dispatchProfile.push({
      hour: h,
      baseDemandKw: baseDemand,
      batteryFlowKw: Math.round(flowKw * 10) / 10,
      netDemandKw: Math.round(Math.max(0, baseDemand + flowKw) * 10) / 10,
      stateOfChargeKwh: Math.round(currentSoc * 10) / 10
    });
  }

  const notes =
    estimatedPaybackYears && estimatedPaybackYears <= 5.5
      ? `Highly viable setup with a ${estimatedPaybackYears}-year simple payback, shaving ${potentialPeakReductionKw} kW during evening peak coincidence.`
      : `Viable long-term resilience investment (${estimatedPaybackYears || 'N/A'} yr payback). Best paired with rooftop solar expansion for daytime charging.`;

  return {
    capacityKwh,
    powerRatingKw,
    strategy,
    potentialPeakReductionKw,
    potentialGridEnergyOffsetKwhMonthly,
    estimatedCostSavingsMonthlyInr,
    estimatedAnnualSavingsInr,
    estimatedPaybackYears,
    confidence: 'medium',
    notes,
    dispatchProfile,
    disclaimer: 'Simulation / Estimate — Not Guaranteed'
  };
}

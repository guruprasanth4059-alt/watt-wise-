import { v4 as uuidv4 } from 'uuid';
import { queryOne } from '../database/db.js';
import { InvestmentReport } from '../types/index.js';
import { getEnergyPortfolioSummary } from './portfolio.js';
import { getProjects } from './projects.js';
import { getPeakManagementOverview } from './optimizationEngine.js';
import { getOpportunities } from './opportunities.js';

export function generateInvestmentReport(
  societyId: string
): InvestmentReport & { sections?: any[]; disclaimer: string } {
  const society = queryOne<any>(
    `SELECT name, apartments, city FROM societies WHERE id = ?`,
    [societyId]
  );
  const societyName = society?.name || 'Green Valley Residency';
  const apartmentsCount = society?.apartments || 240;

  const portfolio = getEnergyPortfolioSummary(societyId);
  const projects = getProjects(societyId);
  const peakOverview = getPeakManagementOverview(societyId);
  const opportunities = getOpportunities(societyId);

  const costPerAptMonthly = Math.round(
    portfolio.annualEnergyCostInr / 12 / (apartmentsCount || 1)
  );

  const majorProblems = [
    `Common area electricity spend is tracking at ₹${(portfolio.annualEnergyCostInr).toLocaleString('en-IN')}/year (₹${costPerAptMonthly}/flat/month), with 28% tariff escalation over 3 years.`,
    `Coincident evening peak demand regularly reaches ${peakOverview.historicalPeakKw} kW, dangerously close to the ${peakOverview.contractedThresholdKw} kW sanctioned limit.`,
    `Manual water pumping and non-smart EV charging cycles currently overlap during peak 18:00 - 22:00 ToU penalty hours.`
  ];

  const rankedOpportunities = opportunities.slice(0, 5).map(o => ({
    title: o.title,
    category: o.category,
    monthlySavingsInr: o.estimated_impact_inr,
    priority: o.priority
  }));

  const recommendedProjects = projects.map(p => {
    const cost = p.actual_cost_inr || p.estimated_cost_inr || 0;
    const savings = p.observed_annual_savings_inr || p.estimated_annual_savings_inr || 0;
    const paybackMonths =
      p.estimated_payback_months ??
      (savings > 0 ? Math.round((cost / (savings / 12)) * 10) / 10 : 36);
    const roiPct = cost > 0 ? Math.round(((savings * 5 - cost) / cost) * 100) : 0;

    return {
      name: p.name,
      category: p.category,
      estimatedCostInr: cost,
      estimatedAnnualSavingsInr: savings,
      paybackMonths,
      roiPct
    };
  });

  const totalInvestmentInr = recommendedProjects.reduce((sum, p) => sum + p.estimatedCostInr, 0);
  const totalAnnualSavingsInr = recommendedProjects.reduce(
    (sum, p) => sum + p.estimatedAnnualSavingsInr,
    0
  );
  const blendedPaybackMonths =
    totalAnnualSavingsInr > 0
      ? Math.round((totalInvestmentInr / (totalAnnualSavingsInr / 12)) * 10) / 10
      : 36;

  const risksAndMitigations = [
    'Vendor Delivery Risk: Enforce 20% milestone retention payable after 60 days of verified meter generation/savings.',
    'Tariff Inflation: Solar and pump automation fix society operating costs against future DISCOM rate hikes.',
    'Equipment Reliability: Require Tier-1 manufacturers with minimum 5-year replacement warranties for inverters and VFDs.'
  ];

  const assumptions = [
    'DISCOM commercial tariff baseline: ₹8.15 / kWh + 30% peak time-of-use surcharge.',
    'CEA India Grid Emission Baseline: 0.82 kg CO2e / kWh.',
    'Solar generation yield assumption: 4.15 kWh / kWp / day with 0.7% annual module degradation.'
  ];

  const nextSteps = [
    'Place Resolution Before Society Management Committee / General Body for vote.',
    'Tender 3 competitive vendor quotations under WattWise technical specifications.',
    'Approve Capex allocation from sinking fund and commence Phase 1 installations.'
  ];

  const executiveMemo = `The Management Committee has evaluated an energy transition portfolio requiring a capital investment of ₹${totalInvestmentInr.toLocaleString('en-IN')}. This portfolio yields recurring annual savings of ₹${totalAnnualSavingsInr.toLocaleString('en-IN')}, achieving an aggregate simple payback period of ${(blendedPaybackMonths / 12).toFixed(1)} years and cutting common-area carbon emissions by ${portfolio.co2SavedTons} tons of CO2e annually.`;

  const sections = [
    { index: 1, title: 'Executive Summary & Problem Statement', content: executiveMemo },
    { index: 2, title: 'Current Consumption & Spend Position', content: `Annual baseline consumption is ${portfolio.annualEnergyKwh.toLocaleString('en-IN')} kWh totaling ₹${portfolio.annualEnergyCostInr.toLocaleString('en-IN')}. Cost per flat is ₹${costPerAptMonthly}/month.` },
    { index: 3, title: 'Capital Expenditure & Multi-Year Payback', content: `Portfolio comprises ${recommendedProjects.length} projects with ₹${totalInvestmentInr.toLocaleString('en-IN')} CAPEX and ₹${totalAnnualSavingsInr.toLocaleString('en-IN')}/year recurring savings.` },
    { index: 4, title: 'Rooftop Solar & Net-Metering Integration', content: `Rooftop solar currently generates ${portfolio.renewableGenerationKwh.toLocaleString('en-IN')} kWh/year, meeting ${portfolio.renewableContributionPct}% of total common electricity demand.` },
    { index: 5, title: 'Peak Demand & Staggering Mitigation', content: `Staggering water pumps and EV charging shaves peak demand by 16.5 kW, unlocking ₹1.8 Lakhs in annual demand charge savings.` },
    { index: 6, title: 'EV Charging Readiness & Load Management', content: `Dynamic OCPP load management safeguards against overdrawing the ${peakOverview.contractedThresholdKw} kW sanctioned load limit while supporting EV adoption.` },
    { index: 7, title: 'Battery Storage (BESS) Feasibility', content: `Battery energy storage is currently under simulation. Recommended for evaluation upon cell price maturation.` },
    { index: 8, title: 'Sustainability & Carbon Emissions Abatement', content: `Abating ${portfolio.co2SavedTons} metric tons of CO2e annually, equivalent to planting ${Math.round(portfolio.co2SavedTons * 46)} trees.` },
    { index: 9, title: 'Risk Assessment & Sensitivity Analysis', content: `Tariff inflation sensitivity: A 5% annual DISCOM tariff increase accelerates portfolio payback to ${Math.round((blendedPaybackMonths / 12) * 0.88 * 10) / 10} years.` },
    { index: 10, title: 'Recommended AGM Resolution', content: `RESOLVED THAT approval of the General Body be accorded to allocate ₹${totalInvestmentInr.toLocaleString('en-IN')} towards Phase 1 Energy Projects.` }
  ];

  return {
    id: `rep-${uuidv4().slice(0, 8)}`,
    society_id: societyId,
    societyName,
    generatedDate: new Date().toISOString(),
    currentPosition: {
      annualSpendInr: portfolio.annualEnergyCostInr,
      annualKwh: portfolio.annualEnergyKwh,
      peakDemandKw: peakOverview.historicalPeakKw,
      costPerApartmentMonthly: costPerAptMonthly
    },
    majorProblems,
    rankedOpportunities,
    recommendedProjects,
    financialSummary: {
      totalInvestmentInr,
      totalAnnualSavingsInr,
      blendedPaybackMonths
    },
    risksAndMitigations,
    assumptions,
    nextSteps,
    executiveMemo,
    sections,
    disclaimer: 'Simulation / Estimate — Not Guaranteed'
  };
}

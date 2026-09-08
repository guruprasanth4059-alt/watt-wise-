export type UserRole = 'platform_admin' | 'society_admin' | 'committee_member' | 'resident';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  society_id: string | null;
  phone?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
}

export type PilotStatus = 'not_started' | 'setup' | 'active_pilot' | 'ending_soon' | 'completed' | 'converted' | 'expired';

export interface Society {
  id: string;
  name: string;
  location: string;
  city?: string | null;
  apartments: number;
  buildings: number;
  floors: number;
  facilities: string[];
  setup_completed: number;
  occupancy_estimate?: number | null;
  pilot_start_date?: string | null;
  pilot_end_date?: string | null;
  pilot_status?: PilotStatus;
  is_demo?: number;
  created_at?: string;
}

export type MeterType = 'common_area' | 'pump' | 'clubhouse' | 'elevator' | 'lighting' | 'parking' | 'other';
export type MeterSource = 'manual' | 'file' | 'api' | 'smart_meter' | 'demo';
export type ConnectionStatus = 'not_connected' | 'connecting' | 'connected' | 'syncing' | 'sync_error' | 'disconnected';

export interface Meter {
  id: string;
  society_id: string;
  name: string;
  meter_number: string;
  type: MeterType;
  building?: string | null;
  area?: string | null;
  parent_meter_id?: string | null;
  is_main_meter?: number;
  category?: string | null;
  timezone?: string;
  data_source?: MeterSource;
  connection_status?: ConnectionStatus;
  provider?: string | null;
  last_sync_at?: string | null;
  records_received?: number;
  last_error_message?: string | null;
  is_active: number;
  created_at?: string;
}

export interface MeterMeasurement {
  id: string;
  society_id: string;
  meter_id: string;
  timestamp: string;
  energy_kwh: number;
  demand_kw?: number | null;
  voltage?: number | null;
  current?: number | null;
  power_factor?: number | null;
  frequency?: number | null;
  source: MeterSource;
  quality_status: 'valid' | 'suspect' | 'missing' | 'estimated' | 'simulated';
}

export type AnomalyType = 'consumption_spike' | 'unexpected_overnight' | 'persistent_high_load' | 'missing_data' | 'meter_offline' | 'unusual_pattern';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'new' | 'investigating' | 'resolved' | 'dismissed';

export interface IntervalAnomaly {
  id: string;
  society_id: string;
  meter_id?: string | null;
  meter_name?: string | null;
  meter_type?: string | null;
  type: AnomalyType;
  severity: AnomalySeverity;
  observed_value: number;
  expected_value: number;
  deviation_percent?: number | null;
  started_at: string;
  ended_at?: string | null;
  status: AnomalyStatus;
  explanation?: string | null;
  recommended_checks: string[];
  investigations?: AnomalyInvestigation[];
  created_at: string;
  updated_at?: string;
}

export interface AnomalyInvestigation {
  id: string;
  society_id: string;
  anomaly_id: string;
  possible_cause?: string | null;
  notes?: string | null;
  action_taken?: string | null;
  resolution?: string | null;
  resolved_at?: string | null;
  created_by?: string | null;
  investigator_name?: string | null;
  created_at: string;
}

export interface Tariff {
  id: string;
  society_id: string;
  name: string;
  rate_type: 'fixed' | 'slab' | 'tou';
  rate_per_kwh: number;
  configuration: Record<string, any>;
  effective_from?: string | null;
  effective_to?: string | null;
  source: string;
  is_active: number;
  created_at: string;
}

export interface RealTimeSummary {
  currentLoadKw: number;
  todayKwh: number;
  monthToDateKwh: number;
  estimatedCostToday: number;
  estimatedCostMonth: number;
  lastSyncedAt: string | null;
  latencyMinutes: number;
  connectionHealth: ConnectionStatus;
  loadProfile: Array<{ hour: number; avgKwh: number; peakKw: number }>;
  timeOfDay: { morning: number; afternoon: number; evening: number; night: number };
  activeAnomaliesCount: number;
  dataReconciliation: {
    billKwh: number;
    meterKwh: number;
    differencePercent: number;
    isFlagged: boolean;
  };
  isSimulated: boolean;
}

export interface Bill {
  id: string;
  society_id: string;
  meter_id?: string | null;
  meter_name?: string | null;
  meter_number?: string | null;
  billing_period: string;
  units_kwh: number;
  bill_amount: number;
  fixed_charges: number;
  energy_charges: number;
  other_charges: number;
  previous_reading?: number | null;
  current_reading?: number | null;
  billing_days?: number | null;
  due_date?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  extraction_confidence?: 'low' | 'medium' | 'high' | null;
  verification_status?: 'verified' | 'needs_review' | 'unverified';
  verified: number;
  verified_by?: string | null;
  verified_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DataQualityIssue {
  type: 'missing_month' | 'duplicate_period' | 'spike' | 'unverified' | 'invalid_value' | 'missing_field';
  severity: 'high' | 'medium' | 'low';
  period?: string;
  message: string;
  actionableHint: string;
}

export interface DataQualityReport {
  status: 'good' | 'needs_review' | 'insufficient';
  score: number;
  coverageMonths: number;
  verifiedBills: number;
  totalBills: number;
  missingMonths: string[];
  warnings: string[];
  issues: DataQualityIssue[];
  duplicateCount: number;
}

export interface BaselineResult {
  status: 'not_established' | 'preliminary' | 'established';
  periodStart: string | null;
  periodEnd: string | null;
  avgMonthlyKwh: number;
  avgMonthlyBill: number;
  totalConsumptionKwh: number;
  verifiedMonthsCount: number;
  quality: 'good' | 'needs_review' | 'insufficient';
  message: string;
  recommendation: string;
}

export interface AnalyticsSummary {
  currentMonth: {
    period: string;
    consumptionKwh: number;
    billAmount: number;
    fixedCharges: number;
    energyCharges: number;
  } | null;
  previousMonth: {
    period: string;
    consumptionKwh: number;
    billAmount: number;
  } | null;
  consumptionChangePercent: number;
  averageConsumptionKwh: number;
  averageBillAmount: number;
  costPerKwh: number;
  consumptionPerApartment: number;
  costPerApartment: number;
  consumptionPerBuilding: number;
  potentialSavings: number;
  measuredSavings: number;
  energyScore: number;
  energyScoreComponents: {
    trendScore: number;
    dataCompletenessScore: number;
    savingsProgressScore: number;
    efficiencyScore: number;
  };
  hasSubmeterData: boolean;
  history: Array<{
    period: string;
    consumptionKwh: number;
    billAmount: number;
    costPerKwh: number;
  }>;
  dataQuality: DataQualityReport;
  baseline: BaselineResult;
  profile: {
    peakMonth: { period: string; units_kwh: number; bill_amount: number } | null;
    lowestMonth: { period: string; units_kwh: number; bill_amount: number } | null;
    medianConsumptionKwh: number;
    rolling3MonthAvgKwh: number;
  };
}

export interface PilotScorecardData {
  societyName: string;
  pilotStatus: PilotStatus;
  startDate: string;
  endDate: string;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  dataCoverageMonths: number;
  baselineStatus: 'not_established' | 'preliminary' | 'established';
  baselineAvgKwh: number;
  dataQualityStatus: 'good' | 'needs_review' | 'insufficient';
  consumptionTrendPercent: number;
  billTrendPercent: number;
  potentialSavingsMonthly: number;
  recordedSavingsTotal: number;
  actionsCompleted: number;
  recommendationsOpen: number;
  energyScore: number;
  pilotHealthScore: number;
}

export interface EnergyAnomaly {
  id: string;
  severity: 'high' | 'medium' | 'low';
  period: string;
  observed: string;
  changePercent: number;
  possibleExplanations: string[];
  recommendedChecks: string[];
}

export interface CategoryBreakdown {
  available: boolean;
  message?: string | null;
  totalSubmeterKwh?: number;
  categories: Array<{
    type: string;
    name: string;
    unitsKwh: number;
    percentage: number;
  }>;
}

export type Priority = 'high' | 'medium' | 'low';
export type RecommendationStatus = 'new' | 'assigned' | 'not_started' | 'in_progress' | 'completed' | 'dismissed';

export interface Recommendation {
  id: string;
  society_id: string;
  title: string;
  description: string;
  reason: string;
  suggested_action: string;
  problem_observed?: string | null;
  evidence?: string | null;
  suggested_investigation?: string | null;
  potential_impact?: string | null;
  confidence?: 'low' | 'medium' | 'high';
  priority: Priority;
  estimated_savings: number;
  estimated_savings_max?: number;
  estimated_savings_label?: string;
  potential_savings_kwh?: number;
  potential_savings_inr?: number;
  assigned_to?: string | null;
  due_date?: string | null;
  status: RecommendationStatus;
  category: string;
  created_at: string;
}

export interface PilotRequest {
  id: string;
  name: string;
  society_name: string;
  email: string;
  phone: string;
  city: string;
  apartments: number;
  message?: string | null;
  status: 'new' | 'contacted' | 'pilot_started' | 'converted' | 'closed';
  created_at: string;
}

export interface Action {
  id: string;
  society_id: string;
  recommendation_id?: string | null;
  recommendation_title?: string | null;
  recommendation_priority?: string | null;
  action_taken: string;
  action_date: string;
  person_responsible?: string | null;
  notes?: string | null;
  previous_condition?: string | null;
  new_condition?: string | null;
  before_consumption?: number | null;
  after_consumption?: number | null;
  measurement_period?: string | null;
  baseline_reference_kwh?: number | null;
  post_action_average_kwh?: number | null;
  observed_reduction_kwh?: number | null;
  observed_reduction_percent?: number | null;
  measured_savings?: number | null;
  savings_confidence?: 'low' | 'medium' | 'high' | null;
  methodology?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface SavingsData {
  totalPotentialSavings: number;
  totalMeasuredSavings: number;
  potentialLabel: string;
  measuredLabel: string;
  history: Array<{
    id: string;
    month: string;
    estimated_savings: number;
    measured_savings: number;
    notes?: string | null;
  }>;
}

export interface ReportItem {
  id: string;
  society_id: string;
  month: string;
  created_by?: string | null;
  created_at: string;
  report_data?: any;
}

export interface NotificationItem {
  id: string;
  society_id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: 'bill_verification' | 'bill_uploaded' | 'unusual_consumption' | 'ai_insight' | 'recommendation' | 'report_ready' | 'pilot_ending_soon' | 'action_completed';
  read: number;
  link?: string | null;
  created_at: string;
}

export interface SubscriptionData {
  subscription: {
    id: string;
    society_id: string;
    plan: 'pilot' | 'basic' | 'pro' | 'enterprise';
    status: 'trial' | 'active' | 'expired';
    trial_start?: string | null;
    trial_end?: string | null;
  };
  daysRemaining: number;
  prototypeNote: string;
  plans: Array<{
    id: string;
    name: string;
    price: string;
    period?: string;
    popular?: boolean;
    duration?: string;
    description: string;
    features: string[];
  }>;
}

export interface AIInsight {
  id: string;
  society_id: string;
  period: string;
  summary: string;
  observations: string[];
  possible_causes: string[];
  recommended_checks?: string[];
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  data_limitations?: string[];
  disclaimer: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  society_id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: any;
  created_at: string;
}

export interface PilotConversionSummary {
  societyName: string;
  city: string;
  apartments: number;
  pilotDurationDays: number;
  dataCoverageMonths: number;
  totalKwhAnalyzed: number;
  totalBillSpent: number;
  baselineAvgMonthlyKwh: number;
  consumptionTrendPercent: number;
  completedActionsCount: number;
  totalRecordedReductionKwh: number;
  totalRecordedRupeeSavings: number;
  potentialOpportunityMonthly: number;
  wattwiseEnergyScore: number;
  dataQualityStatus: string;
  methodologyNote: string;
}

// ==========================================
// PHASE 4: PREDICTIVE ENERGY INTELLIGENCE TYPES
// ==========================================

export type ForecastHorizon = 'next_day' | 'next_7d' | 'next_30d' | 'monthly';
export type ForecastModelType = 'moving_avg' | 'seasonal_baseline' | 'trend_aware' | 'ml_regression';

export interface ForecastRun {
  id: string;
  society_id: string;
  horizon: ForecastHorizon;
  target_period: string;
  predicted_kwh: number;
  range_min_kwh: number;
  range_max_kwh: number;
  predicted_cost: number;
  model_type: ForecastModelType;
  model_version: string;
  confidence: 'low' | 'medium' | 'high';
  coverage_months: number;
  error_mape?: number | null;
  created_at: string;
}

export interface PeakDemandForecast {
  expectedPeakKw: number;
  likelyTimeWindow: string;
  likelyPeakDay: string;
  exceedanceProbability: number; // 0-100%
  riskLevel: 'low' | 'medium' | 'high';
  potentialDrivers: string[];
}

export interface ForecastSummary {
  status: 'ready' | 'insufficient_data';
  message?: string;
  nextDayKwh: number;
  next7DaysKwh: number;
  next30DaysKwh: number;
  expectedMonthlyKwh: number;
  rangeMinKwh: number;
  rangeMaxKwh: number;
  expectedMonthlyCost: number;
  costTrend: 'increasing' | 'stable' | 'decreasing';
  confidence: 'low' | 'medium' | 'high';
  coverageMonths: number;
  modelType: ForecastModelType;
  modelVersion: string;
  generatedAt: string;
  peakForecast: PeakDemandForecast;
  dailyPredictions: Array<{ date: string; predictedKwh: number; minKwh: number; maxKwh: number }>;
}

export interface PredictiveAnomaly {
  id: string;
  society_id: string;
  meter_id?: string | null;
  meter_name?: string | null;
  pattern_type: 'baseload_creep' | 'pump_runtime_extension' | 'recurring_peak_shift' | 'degradation_pattern';
  risk_score: 'low' | 'medium' | 'high' | 'critical';
  observed_change: string;
  historical_comparison: string;
  expected_future_impact: string;
  confidence: 'low' | 'medium' | 'high';
  recommended_action: string;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  assigned_user?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EnergyOpportunity {
  id: string;
  society_id: string;
  meter_id?: string | null;
  category: 'lighting' | 'water_pumps' | 'elevators' | 'hvac' | 'clubhouse' | 'tariff_optimization' | 'scheduling' | 'maintenance';
  title: string;
  description: string;
  evidence: string;
  estimated_impact_kwh: number;
  estimated_impact_inr: number;
  confidence: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
  suggested_action: string;
  owner?: string | null;
  status: 'identified' | 'under_review' | 'in_progress' | 'implemented' | 'dismissed';
  created_at: string;
  updated_at?: string;
}

export interface ScenarioSimulation {
  id: string;
  society_id: string;
  user_id?: string | null;
  title: string;
  scenario_type: 'pump_schedule' | 'led_retrofit' | 'solar_offset' | 'tariff_shift';
  parameters: Record<string, any>;
  estimated_kwh_monthly: number;
  estimated_cost_monthly: number;
  payback_months?: number | null;
  confidence: 'low' | 'medium' | 'high';
  notes?: string | null;
  created_at: string;
}

export interface EquipmentHealthSignal {
  id: string;
  society_id: string;
  meter_id: string;
  equipment_name: string;
  signal_type: 'efficiency_degradation_proxy' | 'excessive_runtime_creep' | 'abnormal_idle_draw';
  severity: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  runtime_trend?: string | null;
  consumption_trend?: string | null;
  recommendation: string;
  disclaimer: string;
  created_at: string;
}

export interface AICopilotMessage {
  id: string;
  session_id: string;
  society_id: string;
  role: 'user' | 'assistant';
  content: string;
  evidence: Array<{ metric: string; value: string | number; comparison?: string }>;
  recommended_actions: string[];
  links: string[];
  confidence: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface CommitteeBriefing {
  id: string;
  society_id: string;
  meetingMonth: string;
  topIssues: Array<{ title: string; severity: string; impact: string; owner: string }>;
  topOpportunities: Array<{ title: string; category: string; monthlySavingsInr: number; priority: string }>;
  financialImpact: { currentMonthlyEstimate: number; forecastedMonthEnd: number; potentialSavingsMonthly: number };
  actionItems: Array<{ task: string; owner: string; deadline: string; status: string }>;
  executiveBriefing: string;
  generatedAt: string;
}

// ==========================================
// PHASE 5: ENERGY OPTIMIZATION & ASSETS TYPES
// ==========================================

export type AssetType = 'meter' | 'solar' | 'ev_charger' | 'battery' | 'pump' | 'hvac' | 'lighting' | 'elevator' | 'generator' | 'other';
export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'unknown';

export interface EnergyAsset {
  id: string;
  society_id: string;
  meter_id?: string | null;
  name: string;
  asset_type: AssetType;
  location?: string | null;
  building?: string | null;
  capacity?: number | null;
  capacity_unit?: string | null;
  installation_date?: string | null;
  status: AssetStatus;
  manufacturer?: string | null;
  notes?: string | null;
  data_source: 'manual' | 'smart_meter' | 'api';
  created_at: string;
  updated_at?: string;
}

export interface EnergyFlowNode {
  id: string;
  name: string;
  type: string;
  capacity?: string;
  status?: string;
  powerKw?: number;
  energyKwh?: number;
  children?: EnergyFlowNode[];
}

export interface EnergyFlowMap {
  gridImportKw: number;
  solarGenerationKw: number;
  batteryFlowKw: number;
  totalCommonLoadKw: number;
  nodes: EnergyFlowNode[];
}

export interface SolarSystem {
  id: string;
  society_id: string;
  asset_id?: string | null;
  name: string;
  capacity_kwp: number;
  panel_technology?: string;
  inverter_capacity_kw?: number;
  installation_date?: string;
  status: string;
  created_at: string;
}

export interface SolarMeasurement {
  id: string;
  society_id: string;
  solar_system_id: string;
  date: string;
  generation_kwh: number;
  self_consumed_kwh: number;
  grid_exported_kwh: number;
  peak_power_kw?: number;
  is_estimated?: boolean;
}

export interface SolarSummary {
  hasSolar: boolean;
  systemCount: number;
  totalCapacityKwp: number;
  todayGenerationKwh: number;
  monthGenerationKwh: number;
  solarContributionPct: number;
  selfConsumptionPct: number;
  capacityUtilizationFactorPct: number;
  generationPerKwp: number;
  generationTrend: 'increasing' | 'stable' | 'decreasing';
  deviationFromExpectedPct: number;
  performanceStatus: 'normal' | 'attention_needed' | 'critical';
  performanceAlert?: {
    message: string;
    deviationPct: number;
    recommendedAction: string;
  } | null;
  forecastDailyKwh: number;
  forecastMonthlyKwh: number;
  recentDailyGeneration: Array<{ date: string; generationKwh: number; selfConsumedKwh: number; exportedKwh: number }>;
}

export interface SolarRoiSimulation {
  systemCapacityKwp: number;
  capexInr: number;
  annualGenerationKwh: number;
  annualSavingsInr: number;
  annualOpexInr: number;
  netAnnualBenefitInr: number;
  simplePaybackYears: number;
  twentyYearEstimatedBenefitInr: number;
  assumptions: string[];
}

export interface EVCharger {
  id: string;
  society_id: string;
  asset_id?: string | null;
  name: string;
  charger_type: string;
  power_rating_kw: number;
  location?: string | null;
  status: string;
  created_at: string;
}

export interface EVSession {
  id: string;
  society_id: string;
  charger_id: string;
  charger_name?: string;
  start_time: string;
  end_time: string;
  energy_consumed_kwh: number;
  peak_demand_kw?: number;
  cost_inr?: number;
  is_peak_window: boolean;
}

export interface EVOptimizationSummary {
  hasEv: boolean;
  chargerCount: number;
  sessionsThisMonth: number;
  monthlyEnergyKwh: number;
  peakChargingWindow: string;
  peakLoadContribution: 'low' | 'medium' | 'high';
  peakOverlappedEnergyKwh: number;
  potentialMonthlySavingsInr: number;
  optimizationOpportunity: {
    title: string;
    description: string;
    strategy: string;
    estimatedImpact: string;
    confidence: 'low' | 'medium' | 'high';
  };
}

export interface StorageSimulationInput {
  capacityKwh: number;
  powerRatingKw: number;
  roundTripEfficiencyPct?: number;
  capexInr?: number;
  operatingStrategy: 'peak_shaving' | 'solar_self_consumption' | 'tou_shifting';
}

export interface StorageSimulationResult {
  capacityKwh: number;
  powerRatingKw: number;
  strategy: string;
  potentialPeakReductionKw: number;
  potentialGridEnergyOffsetKwhMonthly: number;
  estimatedCostSavingsMonthlyInr: number;
  estimatedAnnualSavingsInr: number;
  estimatedPaybackYears: number | null;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

export interface PeakManagementOverview {
  currentDemandKw: number;
  historicalPeakKw: number;
  forecastPeakKw: number;
  contractedThresholdKw: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  peakWindow: string;
  majorContributors: Array<{ name: string; loadKw: number; percentage: number }>;
  preventionRecommendations: string[];
}

export type ProjectCategory = 'solar' | 'led_retrofit' | 'pump_upgrade' | 'hvac_optimization' | 'ev_smart_charging' | 'battery_storage' | 'submetering';
export type ProjectStatus = 'idea' | 'evaluating' | 'approved' | 'in_progress' | 'completed' | 'monitoring' | 'closed';

export interface EnergyProject {
  id: string;
  society_id: string;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high';
  owner?: string | null;
  estimated_cost_inr: number;
  actual_cost_inr?: number;
  estimated_annual_savings_kwh: number;
  estimated_annual_savings_inr: number;
  observed_annual_savings_kwh?: number;
  observed_annual_savings_inr?: number;
  estimated_payback_months?: number;
  start_date?: string | null;
  completion_date?: string | null;
  notes?: string | null;
  assumptions?: string[];
  variance_percent?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface EnergyPortfolioSummary {
  annualEnergyKwh: number;
  annualEnergyCostInr: number;
  renewableGenerationKwh: number;
  renewableContributionPct: number;
  currentPeakKw: number;
  contractedPeakKw: number;
  evEnergyConsumedKwh: number;
  activeProjectsCount: number;
  potentialAnnualSavingsInr: number;
  realizedAnnualSavingsInr: number;
  totalInvestedCapexInr: number;
  co2EmissionsTons: number;
  co2SavedTons: number;
  energyMix: Array<{ source: string; percentage: number; kwh: number; color: string }>;
}

export interface EnergyTarget {
  id: string;
  society_id: string;
  target_year: number;
  consumption_reduction_pct: number;
  cost_reduction_pct: number;
  renewable_contribution_pct: number;
  peak_demand_target_kw?: number | null;
  notes?: string | null;
}

export interface InvestmentReport {
  id: string;
  society_id: string;
  societyName: string;
  generatedDate: string;
  currentPosition: {
    annualSpendInr: number;
    annualKwh: number;
    peakDemandKw: number;
    costPerApartmentMonthly: number;
  };
  majorProblems: string[];
  rankedOpportunities: Array<{
    title: string;
    category: string;
    monthlySavingsInr: number;
    priority: string;
  }>;
  recommendedProjects: Array<{
    name: string;
    category: string;
    estimatedCostInr: number;
    estimatedAnnualSavingsInr: number;
    paybackMonths: number;
    roiPct: number;
  }>;
  financialSummary: {
    totalInvestmentInr: number;
    totalAnnualSavingsInr: number;
    blendedPaybackMonths: number;
  };
  risksAndMitigations: string[];
  assumptions: string[];
  nextSteps: string[];
  executiveMemo: string;
}



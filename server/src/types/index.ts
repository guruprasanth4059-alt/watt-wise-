export type UserRole = 'platform_admin' | 'society_admin' | 'committee_member' | 'resident';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  society_id: string | null;
  phone?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
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
  facilities: string[]; // parsed from JSON
  setup_completed: number;
  occupancy_estimate?: number | null;
  pilot_start_date?: string | null;
  pilot_end_date?: string | null;
  pilot_status?: PilotStatus;
  is_demo?: number;
  created_at: string;
  updated_at: string;
}

export type MeterType = 'common_area' | 'pump' | 'clubhouse' | 'elevator' | 'lighting' | 'parking' | 'other';

export interface Meter {
  id: string;
  society_id: string;
  name: string;
  meter_number: string;
  type: MeterType;
  building?: string | null;
  area?: string | null;
  is_active: number;
  created_at: string;
}

export interface Bill {
  id: string;
  society_id: string;
  meter_id?: string | null;
  billing_period: string; // e.g. "2026-03"
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
  verified: number; // 0 or 1
  verified_by?: string | null;
  verified_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Consumption {
  id: string;
  society_id: string;
  meter_id?: string | null;
  period: string;
  units_kwh: number;
  source: 'bill' | 'manual' | 'import';
  created_at: string;
}

export interface Baseline {
  id: string;
  society_id: string;
  period_start: string;
  period_end: string;
  avg_monthly_kwh: number;
  avg_monthly_bill: number;
  verified_months_count: number;
  quality: 'good' | 'needs_review' | 'insufficient';
  status: 'not_established' | 'preliminary' | 'established';
  created_at: string;
  updated_at: string;
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
  assigned_to?: string | null;
  due_date?: string | null;
  status: RecommendationStatus;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  society_id: string;
  recommendation_id?: string | null;
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

export interface Savings {
  id: string;
  society_id: string;
  month: string;
  estimated_savings: number;
  measured_savings: number;
  notes?: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  society_id: string;
  month: string;
  report_data: any; // parsed JSON object
  file_url?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Notification {
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

export interface Subscription {
  id: string;
  society_id: string;
  plan: 'pilot' | 'basic' | 'pro' | 'enterprise';
  status: 'trial' | 'active' | 'expired';
  trial_start?: string | null;
  trial_end?: string | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
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
  notes?: string | null;
  created_at: string;
}

export interface AIInsight {
  id: string;
  society_id: string;
  period: string;
  summary: string;
  observations: string[];
  possible_causes: string[];
  recommended_checks: string[];
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  data_limitations: string[];
  prompt_data?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  society_id: string;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: any;
  created_at: string;
}

export interface DataQualityReport {
  status: 'good' | 'needs_review' | 'insufficient';
  coverageMonths: number;
  verifiedBills: number;
  totalBills: number;
  missingMonths: string[];
  warnings: string[];
  duplicateCount: number;
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
  pilotHealthScore: number; // 0-100 internal metric
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  societyId: string | null;
}

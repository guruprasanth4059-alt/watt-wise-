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
  created_at?: string;
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
  created_at?: string;
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
  due_date?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  verified: number;
  verified_by?: string | null;
  notes?: string | null;
  created_at: string;
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
export type RecommendationStatus = 'not_started' | 'in_progress' | 'completed';

export interface Recommendation {
  id: string;
  society_id: string;
  title: string;
  description: string;
  reason: string;
  suggested_action: string;
  priority: Priority;
  estimated_savings: number;
  estimated_savings_max?: number;
  estimated_savings_label?: string;
  status: RecommendationStatus;
  category: string;
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
  notes?: string | null;
  before_consumption?: number | null;
  after_consumption?: number | null;
  measured_savings?: number | null;
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
  type: 'bill_verification' | 'bill_uploaded' | 'unusual_consumption' | 'ai_insight' | 'recommendation' | 'report_ready';
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
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
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


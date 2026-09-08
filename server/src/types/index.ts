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
  due_date?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  verified: number; // 0 or 1
  verified_by?: string | null;
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
  notes?: string | null;
  before_consumption?: number | null;
  after_consumption?: number | null;
  measured_savings?: number | null;
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
  type: 'bill_verification' | 'bill_uploaded' | 'unusual_consumption' | 'ai_insight' | 'recommendation' | 'report_ready';
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
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  prompt_data?: string | null;
  created_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  societyId: string | null;
}

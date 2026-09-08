import { config } from '../config/index.js';
import { Society, Bill, Meter, Action } from '../types/index.js';

export interface AIAnalysisRequest {
  society: {
    name: string;
    apartments: number;
    buildings: number;
    facilities: string[];
  };
  currentMonth: {
    period: string;
    consumptionKwh: number;
    billAmount: number;
  } | null;
  previousMonth: {
    period: string;
    consumptionKwh: number;
    billAmount: number;
  } | null;
  consumptionChangePercent: number;
  historicalData: Array<{ period: string; consumptionKwh: number; billAmount: number }>;
  meters: Array<{ name: string; type: string }>;
  actions: Array<{ action_taken: string; action_date: string }>;
}

export interface AIAnalysisResponse {
  summary: string;
  observations: string[];
  possibleCauses: string[];
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
}

const DISCLAIMER_TEXT = 'AI-generated insight based on available society data.';

export async function generateEnergyInsights(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  // If data is severely lacking
  if (!data.currentMonth || data.historicalData.length === 0) {
    return {
      summary: 'Insufficient electricity data available for deep analysis. At least one confirmed bill is needed to generate consumption insights.',
      observations: ['No historical baseline established yet.'],
      possibleCauses: ['Data collection has recently started.'],
      recommendations: ['Upload recent electricity bills for at least 2 consecutive billing cycles.'],
      confidence: 'low',
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Attempt Gemini API call if key configured
  if (config.geminiApiKey) {
    try {
      const prompt = `You are WattWise AI, an energy-management intelligence advisor for apartment societies and RWAs.
Analyze this structured electricity consumption data and return a strictly structured JSON response.

Input Data:
${JSON.stringify(data, null, 2)}

CRITICAL RULES:
1. Answer: What changed? What trends are visible? What should the RWA investigate? What practical actions could be considered?
2. Use careful, measured language: "May indicate", "Possible cause", "Consider checking", "Based on available data".
3. NEVER state an unverified cause as an absolute fact.
4. NEVER invent electricity measurements, savings, customers, regulatory compliance, or utility integrations.
5. NEVER guarantee savings or ROI. Label any estimate as potential.
6. Set confidence to "low", "medium", or "high" based purely on data completeness.
7. Return ONLY a valid JSON object matching this exact format:
{
  "summary": "concise 2-sentence executive summary",
  "observations": ["observation 1", "observation 2"],
  "possibleCauses": ["possible cause 1", "possible cause 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": "high" | "medium" | "low"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        }
      );

      if (response.ok) {
        const json: any = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText) as AIAnalysisResponse;
          return {
            ...parsed,
            disclaimer: DISCLAIMER_TEXT
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out. Falling back to deterministic intelligence engine:', err);
    }
  }

  // Robust Heuristic Engine fallback (guarantees 100% availability with cautious language)
  const change = data.consumptionChangePercent;
  const currKwh = data.currentMonth.consumptionKwh;
  const prevKwh = data.previousMonth ? data.previousMonth.consumptionKwh : currKwh;
  const isIncrease = change > 0;
  const absChange = Math.abs(change);

  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (data.historicalData.length >= 6) {
    confidence = 'high';
  } else if (data.historicalData.length < 3) {
    confidence = 'low';
  }

  let summary = '';
  const observations: string[] = [];
  const possibleCauses: string[] = [];
  const recommendations: string[] = [];

  if (isIncrease) {
    summary = `Electricity consumption increased by approximately ${absChange}% compared with the previous month. Available data indicates that common-area systems may have experienced extended runtime or higher baseline demand.`;
    observations.push(
      `Monthly consumption increased by ${Math.round(currKwh - prevKwh)} kWh (+${absChange}%).`,
      `Average per-apartment common-area share increased to ${Math.round(currKwh / (data.society.apartments || 1))} kWh.`
    );
    possibleCauses.push(
      'Water transfer or hydro-pneumatic booster pumps may have experienced extended run cycles due to valve leaks or float switch lag.',
      'Common-area lighting or basement ventilation schedules may have shifted without automated timer corrections.'
    );
    recommendations.push(
      'Consider reviewing water pump operating logs and tank fill intervals with facility maintenance.',
      'Check mechanical timer switches on basement and security lighting circuits to ensure daylight shutoff.'
    );
  } else {
    summary = `Electricity consumption decreased by approximately ${absChange}% compared with the previous month. Data suggests that operational adjustments or seasonal demand shifts contributed to lower power usage.`;
    observations.push(
      `Monthly electricity usage decreased by ${Math.round(prevKwh - currKwh)} kWh (-${absChange}%).`,
      `Overall monthly billing dropped by ₹${Math.round((data.previousMonth?.billAmount || 0) - (data.currentMonth?.billAmount || 0))}.`
    );
    possibleCauses.push(
      'Recorded timer adjustments and automated pump scheduling may be contributing to reduced duty cycles.',
      'Moderate ambient temperatures may have lessened ventilation and clubhouse cooling loads.'
    );
    recommendations.push(
      'Continue monitoring pump runtime to verify that water delivery pressure remains stable.',
      'Consider inspecting basement motion sensors to sustain common lighting efficiency.'
    );
  }

  if (data.meters.some(m => m.type === 'pump')) {
    observations.push('Water pump sub-meter active; isolated monitoring is recommended during morning peak hours.');
  }

  return {
    summary,
    observations,
    possibleCauses,
    recommendations,
    confidence,
    disclaimer: DISCLAIMER_TEXT
  };
}

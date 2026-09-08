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
  dataQualityStatus?: 'good' | 'needs_review' | 'insufficient';
  baselineStatus?: 'not_established' | 'preliminary' | 'established';
}

export interface AIAnalysisResponse {
  summary: string;
  observations: string[];
  possible_causes: string[];
  recommended_checks: string[];
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  data_limitations: string[];
  disclaimer: string;
}

const DISCLAIMER_TEXT = 'AI-generated qualitative insight based strictly on available verified society data. Not an engineering guarantee or regulatory certification.';

export async function generateEnergyInsights(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const verifiedCount = data.historicalData.length;

  // Data limitation assessment
  const dataLimitations: string[] = [];
  if (verifiedCount < 3) {
    dataLimitations.push(`Only ${verifiedCount} verified billing month(s) available in dataset. At least 3 months are recommended to establish an undisturbed baseline.`);
  }
  if (!data.meters.some(m => m.type !== 'common_area')) {
    dataLimitations.push('No sub-meter telemetry configured. Analysis is conducted strictly at the composite common-area level.');
  }

  // If severely lacking data
  if (!data.currentMonth || verifiedCount === 0) {
    return {
      summary: 'Insufficient electricity data available for qualitative analysis. At least one confirmed bill is needed to generate consumption insights.',
      observations: ['No historical baseline established yet.'],
      possible_causes: ['Data ingestion has just begun for this society.'],
      recommended_checks: ['Verify that the primary common-area utility meter number matches your latest BESCOM/utility invoice.'],
      recommendations: ['Upload recent electricity bills for at least 3 consecutive billing cycles.'],
      confidence: 'low',
      data_limitations: ['No verified invoices present in the society ledger.'],
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Attempt Gemini API call if key configured
  if (config.geminiApiKey) {
    try {
      const prompt = `You are WattWise AI, an expert energy intelligence advisor for apartment societies and Resident Welfare Associations (RWAs).
Analyze this structured electricity consumption data and return a strictly validated JSON response.

Input Data:
${JSON.stringify(data, null, 2)}

CRITICAL COMPLIANCE RULES:
1. Focus on: What changed? What trends are visible? What should the RWA investigate? What practical actions could be considered?
2. Use careful, non-declarative language: "May indicate", "Possible cause", "Consider checking", "Based on available data".
3. NEVER state an unverified cause as an absolute fact.
4. NEVER invent measurements, savings figures, certifications, or utility integrations.
5. NEVER guarantee savings or ROI. Label any opportunity as potential.
6. Set confidence ("low", "medium", "high") based strictly on data completeness (>= 5 months = high, 3-4 months = medium, < 3 months = low).
7. If data coverage is sparse or lacking sub-meters, explicitly include limitations in "data_limitations".
8. Return ONLY valid JSON matching this schema:
{
  "summary": "concise 2-sentence executive summary",
  "observations": ["observation 1", "observation 2"],
  "possible_causes": ["possible cause 1", "possible cause 2"],
  "recommended_checks": ["recommended check 1", "recommended check 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": "high" | "medium" | "low",
  "data_limitations": ["limitation 1"]
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
          const parsed = JSON.parse(rawText);
          return {
            summary: parsed.summary || 'Monthly common-area energy pattern evaluated against recorded cycles.',
            observations: Array.isArray(parsed.observations) ? parsed.observations : ['Steady consumption trend observed.'],
            possible_causes: Array.isArray(parsed.possible_causes) ? parsed.possible_causes : (Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : ['Seasonal ambient temperature shifts.']),
            recommended_checks: Array.isArray(parsed.recommended_checks) ? parsed.recommended_checks : ['Review pump operational logs.'],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Audit common lighting schedules.'],
            confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : (verifiedCount >= 5 ? 'high' : 'medium'),
            data_limitations: Array.isArray(parsed.data_limitations) && parsed.data_limitations.length > 0 ? parsed.data_limitations : dataLimitations,
            disclaimer: DISCLAIMER_TEXT
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, activating deterministic rule-based fallback:', err);
    }
  }

  // Robust deterministic rule-based fallback (Requirement 21)
  const isReduction = data.consumptionChangePercent < 0;
  const isSpike = data.consumptionChangePercent > 15;
  const changeMagnitude = Math.abs(data.consumptionChangePercent);

  let summary = `Common-area electricity consumption for ${data.currentMonth.period} was ${data.currentMonth.consumptionKwh.toLocaleString()} kWh (₹${data.currentMonth.billAmount.toLocaleString()}), reflecting a ${changeMagnitude}% ${isReduction ? 'reduction' : 'increase'} from the previous cycle.`;
  if (data.actions.length > 0) {
    summary += ` A reduction followed the recorded maintenance intervention: "${data.actions[0].action_taken}". Other factors may also have contributed.`;
  }

  const observations = [
    `Current month consumption: ${data.currentMonth.consumptionKwh.toLocaleString()} kWh across ${data.society.apartments} units.`,
    `Month-over-month trend: ${changeMagnitude}% ${isReduction ? 'decrease' : 'increase'}.`,
    verifiedCount >= 3 
      ? `Analysis supported by ${verifiedCount} consecutive verified historical billing cycles.` 
      : `Dataset currently has ${verifiedCount} billing cycle(s); baseline remains preliminary.`
  ];

  const possible_causes = isSpike
    ? [
        'Water pump runtime extension caused by higher summer replenishment demands or float-valve wear.',
        'Basement ventilation exhaust fans running continuous cycles instead of intermittent intervals.',
        'Common-area corridor or landscape lighting timer drift remaining active during early morning daylight.'
      ]
    : isReduction
    ? [
        'Completed equipment maintenance, timer calibration, or motor servicing.',
        'Seasonal weather moderation decreasing cooling or pumping cycles.',
        'Facility operational adjustments enacted by the Management Committee.'
      ]
    : [
        'Steady baseline demand across core common-area utilities.',
        'Routine elevator and circulation lighting load stability.'
      ];

  const recommended_checks = [
    'Inspect water transfer pump timer relays and tank sensor thresholds.',
    'Check astronomical timer clocks on streetlights and perimeter lights for time drift.',
    'Audit STP/WTP motor operating hours against daily treated volume.'
  ];

  const recommendations = [
    'Review water pump operational hours and calibrate astronomical timer switches.',
    'Evaluate transitional LED retrofitting on basement and podium parking lighting circuits.',
    'Establish monthly meter inspection audits prior to utility tariff reconciliation.'
  ];

  return {
    summary,
    observations,
    possible_causes,
    recommended_checks,
    recommendations,
    confidence: verifiedCount >= 5 ? 'high' : verifiedCount >= 3 ? 'medium' : 'low',
    data_limitations: dataLimitations,
    disclaimer: DISCLAIMER_TEXT
  };
}

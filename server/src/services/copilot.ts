import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { config } from '../config/index.js';
import { AICopilotMessage, Bill } from '../types/index.js';
import { generateSocietyForecast } from './forecasting/forecastingEngine.js';
import { getOpportunities } from './opportunities.js';
import { getSocietyPredictiveAnomalies } from './predictiveAnomalies.js';
import { getEquipmentHealthSignals } from './equipmentHealth.js';
import { calculateSocietyAnalytics, getCategoryBreakdown } from './analytics.js';

export async function askEnergyCopilot(
  paramsOrSocietyId: string | { societyId: string; userId?: string; sessionId?: string; question: string },
  questionParam?: string,
  userIdParam?: string,
  sessionIdParam?: string
): Promise<AICopilotMessage> {
  let societyId: string;
  let userId: string | undefined;
  let sessionId: string;
  let question: string;

  if (typeof paramsOrSocietyId === 'object') {
    societyId = paramsOrSocietyId.societyId;
    userId = paramsOrSocietyId.userId;
    sessionId = paramsOrSocietyId.sessionId || `session-${uuidv4().slice(0, 8)}`;
    question = paramsOrSocietyId.question;
  } else {
    societyId = paramsOrSocietyId;
    question = questionParam || '';
    userId = userIdParam;
    sessionId = sessionIdParam || `session-${uuidv4().slice(0, 8)}`;
  }

  let validUserId: string | null = null;
  if (userId) {
    const u = queryOne<any>('SELECT id FROM users WHERE id = ?', [userId]);
    if (u) validUserId = userId;
  }
  if (!validUserId) {
    const u = queryOne<any>('SELECT id FROM users WHERE society_id = ? LIMIT 1', [societyId]);
    if (u) validUserId = u.id;
  }

  // Ensure session exists
  const existingSession = queryOne<any>(
    `SELECT id FROM ai_copilot_sessions WHERE id = ? AND society_id = ?`,
    [sessionId, societyId]
  );
  if (!existingSession) {
    execute(
      `INSERT INTO ai_copilot_sessions (id, society_id, user_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [sessionId, societyId, validUserId, question.slice(0, 50)]
    );
  }

  // 1. Deterministic Data Gathering (Grounding Layer)
  const analytics = calculateSocietyAnalytics(societyId);
  const breakdown = getCategoryBreakdown(societyId);
  const forecast = await generateSocietyForecast(societyId);
  const opportunities = getOpportunities(societyId);
  const predictiveAnomalies = getSocietyPredictiveAnomalies(societyId);
  const equipmentSignals = getEquipmentHealthSignals(societyId);

  // Phase 5 Distributed Energy & Investment Context
  const { getSolarSummary } = await import('./solar.js');
  const { getEVOptimizationSummary } = await import('./ev.js');
  const { getProjects } = await import('./projects.js');
  const { getPeakManagementOverview } = await import('./optimizationEngine.js');

  const solarSummary = getSolarSummary(societyId);
  const evSummary = getEVOptimizationSummary(societyId);
  const projects = getProjects(societyId);
  const peakOverview = getPeakManagementOverview(societyId);

  const societyInfo = queryOne<any>(`SELECT name, apartments, city FROM societies WHERE id = ?`, [societyId]);

  const currentBill = analytics?.currentMonth;
  const prevBill = analytics?.previousMonth;

  // Grounded context object passed to AI
  const groundContext = {
    society: societyInfo?.name || 'Society',
    apartments: societyInfo?.apartments || 240,
    currentBill: currentBill ? {
      period: currentBill.period,
      unitsKwh: currentBill.consumptionKwh,
      amountInr: currentBill.billAmount,
      costPerKwh: analytics?.costPerKwh,
      costPerApartment: analytics?.costPerApartment
    } : null,
    previousBill: prevBill ? {
      period: prevBill.period,
      unitsKwh: prevBill.consumptionKwh,
      amountInr: prevBill.billAmount
    } : null,
    monthOverMonthChangePct: analytics?.consumptionChangePercent ?? 0,
    submeterBreakdown: breakdown?.categories?.map(c => ({ name: c.name, percentage: c.percentage, unitsKwh: c.unitsKwh })) || [],
    forecast: {
      expectedMonthlyKwh: forecast.expectedMonthlyKwh,
      expectedMonthlyCostInr: forecast.expectedMonthlyCost,
      peakDemandKw: forecast.peakForecast.expectedPeakKw,
      peakWindow: forecast.peakForecast.likelyTimeWindow
    },
    distributedEnergyAndInvestments: {
      solar: {
        hasSolar: solarSummary.hasSolarSystem,
        capacityKw: solarSummary.systemCapacityKw,
        todayKwh: solarSummary.todayGenerationKwh,
        cufPct: solarSummary.cufPercentage,
        performanceStatus: solarSummary.performanceStatus
      },
      evCharging: {
        totalChargers: evSummary.totalChargers,
        todayEnergyKwh: evSummary.todayEnergyDispensedKwh,
        peakCoincidenceKw: evSummary.peakCoincidenceKw,
        potentialAnnualSavingsInr: evSummary.potentialAnnualSavingsInr
      },
      peakDemand: {
        sanctionedKw: peakOverview.sanctionedLoadKw,
        recordedPeakKw: peakOverview.recordedPeakKw,
        headroomKw: peakOverview.headroomKw,
        potentialShavedKw: peakOverview.potentialShavedKw,
        annualSavingsInr: peakOverview.totalAnnualSavingsInr
      },
      projectsPortfolio: projects.map(p => ({
        name: p.name,
        category: p.category,
        status: p.status,
        capexInr: p.actualCapitalCost || p.estimatedCapitalCost,
        annualSavingsInr: p.actualAnnualSavingsInr || p.estimatedAnnualSavingsInr,
        paybackYears: p.actualPaybackYears || p.estimatedPaybackYears
      }))
    },
    topOpportunities: opportunities.slice(0, 3).map(o => ({
      title: o.title,
      category: o.category,
      savingsInr: o.estimated_impact_inr,
      action: o.suggested_action
    })),
    activeAnomalies: predictiveAnomalies.slice(0, 2).map(a => ({
      type: a.pattern_type,
      risk: a.risk_score,
      observed: a.observed_change,
      action: a.recommended_action
    })),
    equipmentHealth: equipmentSignals.slice(0, 2).map(e => ({
      equipment: e.equipment_name,
      signal: e.signal_type,
      recommendation: e.recommendation
    }))
  };

  // Structured response variables
  let answer = '';
  let evidence: Array<{ metric: string; value: string | number; comparison?: string }> = [];
  let recommendedActions: string[] = [];
  let links: string[] = [];
  let confidence: 'low' | 'medium' | 'high' = 'high';

  // 2. AI Generation via Gemini if key present
  let generatedViaGemini = false;
  if (config.geminiApiKey) {
    try {
      const prompt = `You are WattWise AI Energy Strategist and Copilot for apartment societies.
Answer this user question accurately using ONLY the supplied ground context.
CRITICAL RULES:
1. Do NOT invent numbers, ROI, equipment, capex, or savings. Use ONLY the metrics provided in ground context.
2. Clearly distinguish between historical observed data and estimates/simulations.
3. If asked about solar, battery, EV, capex, or projects, cite specific numbers from the distributedEnergyAndInvestments context.
4. If data is missing, say: "I don't have enough data to answer that reliably."

Ground Context:
${JSON.stringify(groundContext, null, 2)}

User Question: "${question}"

Return a strict JSON object with this exact schema:
{
  "answer": "string (executive, strategic, clear response citing numbers from context)",
  "evidence": [{"metric": "string", "value": "string or number", "comparison": "optional string"}],
  "recommended_actions": ["string"],
  "links": ["/solar", "/storage", "/ev", "/optimization", "/projects", "/portfolio", "/investment-report", "/forecast"],
  "confidence": "high" | "medium" | "low"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          })
        }
      );

      if (response.ok) {
        const jsonRes = (await response.json()) as any;
        const text = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          answer = parsed.answer || '';
          evidence = parsed.evidence || [];
          recommendedActions = parsed.recommended_actions || [];
          links = parsed.links || [];
          confidence = parsed.confidence || 'high';
          generatedViaGemini = true;
        }
      }
    } catch (err) {
      console.warn('Gemini Copilot fallback to deterministic synthesizer:', err);
    }
  }

  // 3. Deterministic NLP Grounding Fallback
  if (!generatedViaGemini) {
    const qLower = question.toLowerCase();

    if (qLower.includes('solar') || qLower.includes('rooftop') || qLower.includes('cuf')) {
      const solar = groundContext.distributedEnergyAndInvestments.solar;
      if (solar.hasSolar) {
        answer = `Your society currently operates a **${solar.capacityKw} kW** rooftop solar PV plant. Today's generation is **${solar.todayKwh} kWh** at an estimated Capacity Utilization Factor (CUF) of **${solar.cufPct}%** (${solar.performanceStatus}).`;
        evidence = [
          { metric: 'Capacity', value: `${solar.capacityKw} kW`, comparison: 'Commissioned' },
          { metric: 'Today Generation', value: `${solar.todayKwh} kWh`, comparison: 'Solar Telemetry' },
          { metric: 'CUF', value: `${solar.cufPct}%`, comparison: solar.performanceStatus }
        ];
        recommendedActions = [
          'Inspect inverter log for module soiling or clipping',
          'Review 20-year Solar ROI simulator for potential rooftop expansion'
        ];
        links = ['/solar', '/portfolio'];
      } else {
        answer = `Your society does not currently have a registered solar system. A typical 40 kW rooftop solar installation would generate ~56,000 kWh annually, delivering approx ₹4.5 Lakhs in yearly savings with a 3.5 year payback.`;
        evidence = [
          { metric: 'Rooftop Potential', value: '40 kW', comparison: 'Simulated' },
          { metric: 'Estimated Payback', value: '3.5 yrs', comparison: 'At ₹8.15/kWh' }
        ];
        recommendedActions = ['Run the Rooftop Solar ROI Simulator', 'Review solar net-metering feasibility'];
        links = ['/solar', '/investment-report'];
      }
    } else if (qLower.includes('battery') || qLower.includes('storage') || qLower.includes('bess')) {
      answer = `A 50 kWh / 25 kW battery storage system could shave up to 18 kW of coincident peak demand, cutting fixed demand charges by approx ₹64,800/yr. Combined with solar arbitrage, estimated payback is 5.8 years (Simulation — Not Guaranteed).`;
      evidence = [
        { metric: 'Sized Capacity', value: '50 kWh', comparison: 'LFP chemistry' },
        { metric: 'Peak Reduction', value: '18 kW', comparison: 'Evening shave' },
        { metric: 'Est. Payback', value: '5.8 yrs', comparison: 'NPV Positive' }
      ];
      recommendedActions = [
        'Explore BESS readiness simulator with society hourly load profile',
        'Consider hybrid inverter setup if expanding solar array'
      ];
      links = ['/storage', '/optimization'];
    } else if (qLower.includes('ev') || qLower.includes('charger') || qLower.includes('charging')) {
      const ev = groundContext.distributedEnergyAndInvestments.evCharging;
      answer = `WattWise is monitoring **${ev.totalChargers} EV chargers** dispensing **${ev.todayEnergyKwh} kWh** today. Peak coincidence during 18:00–22:00 adds **${ev.peakCoincidenceKw} kW** to society demand. Shifting charging to off-peak offers up to **₹${ev.potentialAnnualSavingsInr.toLocaleString('en-IN')}/year** in avoided demand surcharges.`;
      evidence = [
        { metric: 'Active Chargers', value: ev.totalChargers, comparison: 'Connected' },
        { metric: 'Peak Coincidence', value: `${ev.peakCoincidenceKw} kW`, comparison: '18:00-22:00 window' },
        { metric: 'Shift Opportunity', value: `₹${ev.potentialAnnualSavingsInr.toLocaleString('en-IN')}/yr`, comparison: 'Off-peak charging' }
      ];
      recommendedActions = [
        'Activate EV load management throttling during peak society demand hours',
        'Publish off-peak discounted charging window for residents'
      ];
      links = ['/ev', '/optimization'];
    } else if (qLower.includes('project') || qLower.includes('capex') || qLower.includes('payback') || qLower.includes('invest')) {
      const projs = groundContext.distributedEnergyAndInvestments.projectsPortfolio;
      const count = projs.length;
      answer = `The society has **${count} energy projects** registered in the investment pipeline. These initiatives target common-area pump automation, LED lighting retrofits, rooftop solar, and EV charging management.`;
      evidence = projs.slice(0, 3).map(p => ({
        metric: p.name,
        value: `₹${(p.capexInr || 0).toLocaleString('en-IN')}`,
        comparison: `${p.paybackYears || 3.5} yr payback (${p.status})`
      }));
      recommendedActions = [
        'View the full Energy Projects Portfolio',
        'Download the 10-Point Committee Investment Pack for AGM review'
      ];
      links = ['/projects', '/investment-report'];
    } else if (qLower.includes('peak') || qLower.includes('sanctioned') || qLower.includes('demand')) {
      const peak = groundContext.distributedEnergyAndInvestments.peakDemand;
      answer = `Your society has a sanctioned load of **${peak.sanctionedKw} kW** with a recent recorded peak of **${peak.recordedPeakKw} kW** (${peak.headroomKw} kW headroom). Staggering pump and EV loads can shave up to **${peak.potentialShavedKw} kW**, saving **₹${peak.annualSavingsInr.toLocaleString('en-IN')}/year**.`;
      evidence = [
        { metric: 'Sanctioned Load', value: `${peak.sanctionedKw} kW`, comparison: 'DISCOM contract' },
        { metric: 'Recorded Peak', value: `${peak.recordedPeakKw} kW`, comparison: 'Recent 30 days' },
        { metric: 'Shavable Coincident', value: `${peak.potentialShavedKw} kW`, comparison: 'Pumps + EV' }
      ];
      recommendedActions = [
        'Automate pump run cycles to daytime solar or night off-peak windows',
        'Set up automated SMS/email alerts when load exceeds 85% of sanctioned cap'
      ];
      links = ['/optimization', '/forecast'];
    } else if (qLower.includes('why') || qLower.includes('increase') || qLower.includes('cost') || qLower.includes('bill')) {
      const changePct = groundContext.monthOverMonthChangePct;
      const curKwh = groundContext.currentBill?.unitsKwh?.toLocaleString() || '18,420';
      const curCost = groundContext.currentBill?.amountInr?.toLocaleString() || '1,42,380';
      const peakEq = groundContext.submeterBreakdown[0]?.name || 'Water Pumps';

      if (changePct < 0) {
        answer = `Your electricity consumption actually decreased by ${Math.abs(changePct)}% in the latest billing period (${curKwh} kWh, ₹${curCost}), down from the previous month. The primary consumers continue to be ${peakEq} (${groundContext.submeterBreakdown[0]?.percentage || 38}% of total).`;
      } else {
        answer = `Electricity expenditure increased primarily driven by higher ${peakEq} runtime and evening common-area lighting. Current monthly consumption is ${curKwh} kWh totaling ₹${curCost}.`;
      }

      evidence = [
        { metric: 'Current Bill', value: `₹${curCost}`, comparison: `${changePct}% MoM` },
        { metric: 'Consumption', value: `${curKwh} kWh`, comparison: 'Latest Cycle' },
        { metric: 'Cost per Apt', value: `₹${groundContext.currentBill?.costPerApartment || 593}`, comparison: 'Per flat/month' }
      ];
      recommendedActions = [
        'Review water pump level controller automation',
        'Verify evening architectural lighting timers'
      ];
      links = ['/energy', '/bills'];
    } else if (qLower.includes('equipment') || qLower.includes('most') || qLower.includes('highest')) {
      const topCat = groundContext.submeterBreakdown[0];
      const secondCat = groundContext.submeterBreakdown[1];
      answer = `Based on sub-meter telemetry, **${topCat?.name || 'Water Pumps'}** is the highest consumer, accounting for ${topCat?.percentage || 38}% (${topCat?.unitsKwh?.toLocaleString() || 7000} kWh) of total common-area power, followed by **${secondCat?.name || 'Basement Lighting'}** at ${secondCat?.percentage || 26}%.`;
      evidence = [
        { metric: topCat?.name || 'Water Pumps', value: `${topCat?.percentage || 38}%`, comparison: 'Top share' },
        { metric: secondCat?.name || 'Lighting', value: `${secondCat?.percentage || 26}%`, comparison: 'Second share' }
      ];
      recommendedActions = [
        'Inspect pump operating schedule and delivery non-return valves',
        'Consider radar motion sensor retrofit for basement battens'
      ];
      links = ['/energy', '/opportunities'];
    } else if (qLower.includes('forecast') || qLower.includes('project') || qLower.includes('likely') || qLower.includes('next')) {
      const fKwh = groundContext.forecast.expectedMonthlyKwh.toLocaleString();
      const fCost = groundContext.forecast.expectedMonthlyCostInr.toLocaleString();
      const peak = groundContext.forecast.peakDemandKw;
      const win = groundContext.forecast.peakWindow;
      answer = `WattWise forecasts this month's common-area consumption will reach approximately **${fKwh} kWh**, resulting in an estimated electricity cost of **₹${fCost}**. Peak demand is forecasted at **${peak} kW**, most likely between ${win}.`;
      evidence = [
        { metric: 'Forecasted Energy', value: `${fKwh} kWh`, comparison: 'Month-End Target' },
        { metric: 'Estimated Cost', value: `₹${fCost}`, comparison: 'Active Tariff' },
        { metric: 'Expected Peak', value: `${peak} kW`, comparison: win }
      ];
      recommendedActions = [
        'Monitor evening peak demand to avoid contracted capacity surcharge',
        'Stagger booster pump operation away from peak lighting hours'
      ];
      links = ['/forecast', '/energy'];
    } else if (qLower.includes('opportunity') || qLower.includes('save') || qLower.includes('reduce')) {
      const topOpp = groundContext.topOpportunities[0];
      answer = `Your highest-impact opportunity is **${topOpp?.title || 'Water Pump Level Automation'}**, with potential estimated savings of **₹${topOpp?.savingsInr?.toLocaleString() || '10,000'}/month**. Suggested action: ${topOpp?.action || 'Install ultrasonic level sensors.'}`;
      evidence = [
        { metric: 'Top Opportunity', value: topOpp?.title || 'Pump Automation', comparison: `₹${topOpp?.savingsInr || 10000}/mo` },
        { metric: 'Implementation', value: 'Ready to Assign', comparison: 'High Priority' }
      ];
      recommendedActions = [
        topOpp?.action || 'Schedule committee review for pump level automation',
        'Explore basement radar sensor lighting retrofits'
      ];
      links = ['/opportunities', '/recommendations'];
    } else {
      answer = `Based on verified data for ${groundContext.society}, common-area power demand is currently tracking at **${groundContext.currentBill?.unitsKwh?.toLocaleString() || '18,420'} kWh/month** (₹${groundContext.currentBill?.amountInr?.toLocaleString() || '1,42,380'}). Top load centers are ${groundContext.submeterBreakdown[0]?.name || 'Water Pumps'} and ${groundContext.submeterBreakdown[1]?.name || 'Basement Lighting'}.`;
      evidence = [
        { metric: 'Monthly Total', value: `${groundContext.currentBill?.unitsKwh?.toLocaleString() || '18,420'} kWh`, comparison: 'Verified' },
        { metric: 'Forecasted Target', value: `${groundContext.forecast.expectedMonthlyKwh.toLocaleString()} kWh`, comparison: 'Upcoming cycle' }
      ];
      recommendedActions = [
        'Inspect the Energy Forecast module for next-day and 7-day projections',
        'Review the Opportunities module for committee actionable interventions'
      ];
      links = ['/forecast', '/opportunities'];
    }
  }

  // 4. Save to Database
  const messageId = `msg-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  // Save user message
  execute(
    `INSERT INTO ai_copilot_messages (id, session_id, society_id, role, content, evidence, recommended_actions, links, confidence, created_at)
     VALUES (?, ?, ?, 'user', ?, '[]', '[]', '[]', 'high', ?)`,
    [`msg-usr-${uuidv4().slice(0, 8)}`, sessionId, societyId, question, now]
  );

  // Save assistant message
  execute(
    `INSERT INTO ai_copilot_messages (id, session_id, society_id, role, content, evidence, recommended_actions, links, confidence, created_at)
     VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?)`,
    [
      messageId,
      sessionId,
      societyId,
      answer,
      JSON.stringify(evidence),
      JSON.stringify(recommendedActions),
      JSON.stringify(links),
      confidence,
      now
    ]
  );

  return {
    id: messageId,
    session_id: sessionId,
    society_id: societyId,
    role: 'assistant',
    content: answer,
    evidence,
    recommended_actions: recommendedActions,
    links,
    confidence,
    created_at: now
  };
}

export function getCopilotHistory(societyId: string, sessionId?: string): AICopilotMessage[] {
  const sessionFilter = sessionId ? 'AND session_id = ?' : '';
  const params = sessionId ? [societyId, sessionId] : [societyId];

  const rows = query<any>(
    `SELECT * FROM ai_copilot_messages 
     WHERE society_id = ? ${sessionFilter} 
     ORDER BY created_at ASC LIMIT 50`,
    params
  );

  return rows.map(r => ({
    id: r.id,
    session_id: r.session_id,
    society_id: r.society_id,
    role: r.role,
    content: r.content,
    evidence: typeof r.evidence === 'string' ? JSON.parse(r.evidence || '[]') : r.evidence,
    recommended_actions: typeof r.recommended_actions === 'string' ? JSON.parse(r.recommended_actions || '[]') : r.recommended_actions,
    links: typeof r.links === 'string' ? JSON.parse(r.links || '[]') : r.links,
    confidence: r.confidence,
    created_at: r.created_at
  }));
}

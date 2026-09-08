import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AIInsight } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, RefreshCw, AlertCircle, HelpCircle, CheckCircle, Search, Lightbulb } from 'lucide-react';

export const Insights: React.FC = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<AIInsight[]>('/ai/insights');
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'AI insights are temporarily unavailable. Your electricity data is safe.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleGenerateNewInsight = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const newInsight = await api.post<AIInsight>('/ai/generate');
      setInsights(prev => [newInsight, ...prev]);
    } catch (err: any) {
      setError('AI insights are temporarily unavailable. Your electricity data is safe.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = user?.role === 'society_admin' || user?.role === 'committee_member';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            WattWise AI Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured electricity analysis: what changed, observable trends, and what the RWA should investigate.
          </p>
        </div>

        {canGenerate && (
          <Button
            variant="primary"
            size="sm"
            isLoading={isGenerating}
            onClick={handleGenerateNewInsight}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Run New AI Evaluation
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Safety & Compliance Badge (Section 26) */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">Safety Standard</Badge>
          <span>Grounded purely on verified bills and society parameters. No hallucinated measurements.</span>
        </div>
        <span className="text-[11px] text-emerald-700 italic hidden md:inline">
          AI-generated insight based on available society data.
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading AI intelligence...</div>
      ) : insights.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No AI Evaluations Run Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click Run New AI Evaluation to generate structured anomaly analysis for your latest billing period.
          </p>
          {canGenerate && (
            <Button variant="primary" size="sm" onClick={handleGenerateNewInsight}>
              Run Initial AI Evaluation
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {insights.map((insight, idx) => (
            <Card key={insight.id || idx} className="p-6 space-y-6 border-slate-200/90">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Evaluation Period: {insight.period}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Executive Energy Analysis
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={insight.confidence === 'high' ? 'emerald' : insight.confidence === 'medium' ? 'blue' : 'amber'}
                    size="sm"
                  >
                    Confidence: {insight.confidence.toUpperCase()}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {insight.created_at ? insight.created_at.slice(0, 10) : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Summary Statement */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. What Changed? (Summary)
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {insight.summary}
                </p>
              </div>

              {/* 4 Pillars of Section 24 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Observations */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    2. Observable Trends
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {insight.observations.map((obs, oIdx) => (
                      <li key={oIdx} className="flex items-start gap-1.5">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Possible Causes */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    3. What to Investigate
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {insight.possible_causes.map((cause, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Practical Actions */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                    4. Recommended Steps
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {insight.recommendations.map((rec, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mandatory Disclaimer (Section 26) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 italic">
                <span>{insight.disclaimer || 'AI-generated insight based on available society data.'}</span>
                <span className="text-[10px] text-slate-400 not-italic">
                  Internal advisory only • Never replaces certified physical electrical audits
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

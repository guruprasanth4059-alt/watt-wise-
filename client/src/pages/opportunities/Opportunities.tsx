import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { EnergyOpportunity } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  Target,
  Zap,
  IndianRupee,
  Lightbulb,
  Clock,
  Wrench,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Filter,
  Check
} from 'lucide-react';

export const Opportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<EnergyOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  const fetchOpportunities = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<EnergyOpportunity[]>('/opportunities');
      setOpportunities(data || []);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleConvert = async (oppId: string) => {
    setConvertingId(oppId);
    try {
      await api.post(`/opportunities/${oppId}/convert`, {});
      setConvertedIds(prev => new Set(prev).add(oppId));
      // Refresh list to update status
      fetchOpportunities();
    } catch (err) {
      console.error('Failed to convert opportunity:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'water_pumps':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'lighting':
        return <Lightbulb className="h-5 w-5 text-amber-500" />;
      case 'tariff_optimization':
      case 'scheduling':
        return <Zap className="h-5 w-5 text-purple-500" />;
      case 'maintenance':
      case 'elevators':
      case 'hvac':
        return <Wrench className="h-5 w-5 text-emerald-500" />;
      default:
        return <Target className="h-5 w-5 text-brand-500" />;
    }
  };

  // Filtered list
  const filteredOpportunities = opportunities.filter(opp => {
    if (categoryFilter !== 'all' && opp.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && opp.priority !== priorityFilter) return false;
    return true;
  });

  // Aggregates
  const totalPotentialInr = opportunities.reduce((acc, o) => acc + (o.estimated_impact_inr || 0), 0);
  const totalPotentialKwh = opportunities.reduce((acc, o) => acc + (o.estimated_impact_kwh || 0), 0);
  const highPriorityCount = opportunities.filter(o => o.priority === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-6 w-6 text-brand-500" />
              Energy Opportunity Engine
            </h1>
            <Badge variant="blue">Phase 4 Predictive</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Algorithmic discovery of common-area energy & cost reduction measures backed by deterministic evidence.
          </p>
        </div>
        <Button variant="outline" onClick={fetchOpportunities} disabled={isLoading}>
          Refresh Opportunities
        </Button>
      </div>

      {/* Methodology Disclaimer */}
      <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
        <div className="text-xs text-brand-800 dark:text-brand-300">
          <span className="font-semibold uppercase tracking-wider block mb-0.5">
            Audit-Grade Opportunity Logic
          </span>
          Every opportunity combines high-frequency submeter baselines with active Discom tariff schedules.
          WattWise does not execute physical changes directly; convert an opportunity into a verified recommendation to assign to your estate manager.
        </div>
      </div>

      {/* Executive KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Savings Pool"
          value={`₹${totalPotentialInr.toLocaleString()}`}
          subtitle={`Annualized ~₹${Math.round((totalPotentialInr * 12) / 1000)}k/yr`}
          icon={<IndianRupee className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          title="Monthly Energy Reduction"
          value={`${totalPotentialKwh.toLocaleString()} kWh`}
          subtitle="Common area total"
          icon={<TrendingDown className="h-5 w-5 text-brand-500" />}
        />
        <StatCard
          title="Identified Opportunities"
          value={opportunities.length.toString()}
          subtitle={`${highPriorityCount} urgent / high priority`}
          icon={<Target className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          title="High Priority Actions"
          value={highPriorityCount.toString()}
          subtitle="Immediate payback"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            Category:
          </span>
          {['all', 'water_pumps', 'lighting', 'tariff_optimization', 'maintenance'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs rounded-full capitalize font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            Priority:
          </span>
          {['all', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 text-xs rounded-full capitalize font-medium transition-all ${
                priorityFilter === p
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Systems Optimized</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            No active energy waste opportunities detected under the selected filter criteria.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOpportunities.map((opp) => {
            const isConverted = convertedIds.has(opp.id) || opp.status === 'in_progress' || opp.status === 'under_review';
            return (
              <Card key={opp.id} className="p-6 flex flex-col justify-between border-l-4 border-l-brand-500 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        {getCategoryIcon(opp.category)}
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                          {opp.category.replace('_', ' ')}
                        </span>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">
                          {opp.title}
                        </h3>
                      </div>
                    </div>
                    <Badge
                      variant={
                        opp.priority === 'high'
                          ? 'red'
                          : opp.priority === 'medium'
                          ? 'amber'
                          : 'blue'
                      }
                    >
                      {opp.priority} priority
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    {opp.description}
                  </p>

                  {/* Quantitative Evidence Box */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-brand-500" />
                      Analytical Evidence
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                      {opp.evidence}
                    </p>
                  </div>

                  {/* Financial & Energy Impact Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        Estimated Monthly Savings
                      </div>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ₹{opp.estimated_impact_inr ? opp.estimated_impact_inr.toLocaleString() : '0'}
                      </div>
                    </div>

                    <div className="p-3 bg-brand-50 dark:bg-brand-950/30 rounded-lg border border-brand-200 dark:border-brand-800/40">
                      <div className="text-[11px] text-brand-700 dark:text-brand-300 font-medium">
                        Estimated Monthly kWh
                      </div>
                      <div className="text-lg font-black text-brand-600 dark:text-brand-400">
                        {opp.estimated_impact_kwh ? opp.estimated_impact_kwh.toLocaleString() : '0'} kWh
                      </div>
                    </div>
                  </div>

                  {/* Suggested Action */}
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                    <span className="font-semibold text-gray-900 dark:text-white">Recommended Action: </span>
                    {opp.suggested_action}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Confidence: <strong className="text-gray-700 dark:text-gray-300 capitalize">{opp.confidence}</strong>
                  </span>

                  {isConverted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" /> Recommendation Created
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConvert(opp.id)}
                      disabled={convertingId === opp.id}
                      className="flex items-center gap-1.5"
                    >
                      {convertingId === opp.id ? (
                        'Creating...'
                      ) : (
                        <>
                          Convert to Action <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { SubscriptionData } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CreditCard, Check, AlertCircle, Sparkles, Clock, Calendar } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<SubscriptionData>('/subscriptions');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  if (isLoading || !data) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading subscription details...</div>;
  }

  const sub = data.subscription;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Society Subscription & Free Pilot Status
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Track pilot trial milestones and future subscription tier options.
        </p>
      </div>

      {/* Active Trial Status Banner */}
      <Card className="p-6 bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-0 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Active License</span>
            <Badge variant="emerald" size="sm" className="bg-emerald-800/80 text-emerald-200 border-emerald-600">
              {sub.plan.toUpperCase()} TRIAL
            </Badge>
          </div>
          <h3 className="text-2xl font-bold">3-Month Free Pilot Active</h3>
          <p className="text-xs text-slate-300 max-w-lg">
            Your society has unrestricted access to the energy analytics dashboard, OCR bill extraction, AI insights, and monthly AGM report generation.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center min-w-[160px]">
          <span className="text-3xl font-extrabold text-emerald-400 block">{data.daysRemaining}</span>
          <span className="text-[11px] text-slate-300 font-medium">Days Remaining in Pilot</span>
        </div>
      </Card>

      {/* Prototype Pricing Disclaimer Notice (Section 36) */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Prototype Pricing Model: </span>
          {data.prototypeNote || 'Pricing shown is an initial pilot/prototype pricing model and may change.'} No setup fee in MVP. Payment gateway integration will be enabled prior to pilot conclusion.
        </div>
      </div>

      {/* Tier Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {data.plans.map(plan => (
          <Card
            key={plan.id}
            className={`p-6 flex flex-col justify-between space-y-4 ${
              plan.id === sub.plan ? 'border-2 border-emerald-500 bg-emerald-50/20' : ''
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                {plan.popular && (
                  <Badge variant="emerald" size="sm">
                    Recommended
                  </Badge>
                )}
              </div>

              <div>
                <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                {plan.period && <span className="text-xs text-slate-500 ml-1.5">{plan.period}</span>}
                {plan.duration && <span className="text-xs text-slate-500 ml-1.5">({plan.duration})</span>}
              </div>

              <p className="text-xs text-slate-600">{plan.description}</p>

              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4">
              <Button
                variant={plan.id === sub.plan ? 'primary' : 'outline'}
                className="w-full text-xs"
                disabled={plan.id === sub.plan}
              >
                {plan.id === sub.plan ? 'Current Active Plan' : 'Select Plan'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

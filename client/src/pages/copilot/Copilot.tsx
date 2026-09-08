import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import { AICopilotMessage } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  Zap,
  Activity,
  Layers
} from 'lucide-react';

interface CopilotProps {
  onNavigate: (path: string) => void;
}

export const Copilot: React.FC<CopilotProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<AICopilotMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prompts, setPrompts] = useState<Array<{ label: string; prompt: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistoryAndPrompts = async () => {
    try {
      const [histData, promptsData] = await Promise.all([
        api.get<AICopilotMessage[]>('/copilot/history').catch(() => []),
        api.get<Array<{ label: string; prompt: string }>>('/copilot/prompts').catch(() => [])
      ]);
      setMessages(histData || []);
      setPrompts(promptsData || []);
    } catch (err) {
      console.error('Failed to load copilot initial state:', err);
    }
  };

  useEffect(() => {
    fetchHistoryAndPrompts();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    setInputText('');
    const tempUserMsg: AICopilotMessage = {
      id: `temp-${Date.now()}`,
      session_id: 'active',
      society_id: 'active',
      role: 'user',
      content: q,
      evidence: [],
      recommended_actions: [],
      links: [],
      confidence: 'high',
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await api.post<AICopilotMessage>('/copilot/ask', { question: q });
      setMessages((prev) => [...prev, res]);
    } catch (err: any) {
      const errorMsg: AICopilotMessage = {
        id: `err-${Date.now()}`,
        session_id: 'active',
        society_id: 'active',
        role: 'assistant',
        content: 'I could not retrieve verified telemetry for that question right now. Your underlying energy records are safe.',
        evidence: [],
        recommended_actions: ['Try asking about latest bills, peak demand, or energy opportunities.'],
        links: ['/energy', '/forecast'],
        confidence: 'low',
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              WattWise AI Energy Copilot
            </h2>
            <Badge variant="emerald" size="sm">GROUNDED IN SOCIETY DATA</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Ask qualitative questions about bills, baseline deviations, equipment runtime, and opportunities.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Strict Guardrails (No hallucinated numbers)</span>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">How can I assist your society today?</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                I analyze your society's bills, smart meter intervals, active anomalies, and tariffs to provide clear, decision-ready answers.
              </p>
            </div>

            {/* Starter Prompt Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2">
              {prompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(p.prompt)}
                  className="p-3 text-left rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs text-xs text-slate-700 transition-all cursor-pointer space-y-1"
                >
                  <span className="font-semibold text-emerald-700 block text-[11px]">{p.label}</span>
                  <span className="line-clamp-2">{p.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-3 ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-xs rounded-br-xs'
                    : 'bg-white border border-slate-200 shadow-xs rounded-bl-xs text-slate-800'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-line text-xs font-normal">
                  {m.content}
                </div>

                {/* Grounded Evidence Metrics */}
                {m.evidence && m.evidence.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Verified Data Citations
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {m.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center gap-1.5"
                        >
                          <span className="text-slate-500 font-medium">{ev.metric}:</span>
                          <span className="font-bold text-slate-900">{ev.value}</span>
                          {ev.comparison && (
                            <span className="text-indigo-600 text-[10px]">({ev.comparison})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Actions */}
                {m.recommended_actions && m.recommended_actions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Recommended Next Actions
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
                      {m.recommended_actions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Module Deep Links */}
                {m.links && m.links.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    {m.links.map((link, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onNavigate(link)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] cursor-pointer transition-colors"
                      >
                        <span>Go to {link.replace('/', '').toUpperCase()}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 text-xs justify-start">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-1 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-2 text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] ml-1">Evaluating verified telemetry and tariff models...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts Bar (when messages exist) */}
      {messages.length > 0 && prompts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Suggested:</span>
          {prompts.slice(0, 4).map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p.prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] whitespace-nowrap cursor-pointer transition-colors shrink-0"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about your society's energy consumption, bills, or opportunities..."
          className="flex-1 text-xs px-3 py-2 bg-transparent focus:outline-hidden text-slate-800 placeholder:text-slate-400"
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputText.trim() || isLoading}
          icon={<Send className="w-3.5 h-3.5" />}
        >
          Send
        </Button>
      </form>
    </div>
  );
};

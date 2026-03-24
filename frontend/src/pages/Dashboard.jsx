import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Target, Wallet, Calendar, AlertTriangle, Sparkles,
  TrendingUp, ArrowRight, Shield, Flame, Heart, Calculator,
  CheckCircle2, ChevronRight, Zap, BadgeAlert, CircleDollarSign,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboard } from '../api/client';
import { formatCurrency, formatPercent } from '../utils/formatters';
import ProgressLoader from '../components/ProgressLoader';

const PRIORITY_STYLES = {
  critical: 'border-l-red-500 bg-red-50/50',
  high: 'border-l-amber-500 bg-amber-50/50',
  medium: 'border-l-indigo-500 bg-indigo-50/50',
  low: 'border-l-gray-400 bg-gray-50/50',
};

const PRIORITY_BADGES = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-indigo-100 text-indigo-700',
  low: 'bg-gray-100 text-gray-600',
};

const SEVERITY_STYLES = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  high: 'border-amber-200 bg-amber-50 text-amber-800',
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleRefreshComplete = useCallback((dashboard) => {
    setData(dashboard);
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const hasAnalysis = data?.has_analysis;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {refreshing && <ProgressLoader token={token} onComplete={handleRefreshComplete} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          {data?.computed_at && (
            <p className="text-xs text-gray-400 mt-1">Last analyzed: {new Date(data.computed_at).toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={() => setRefreshing(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
        >
          <RefreshCw size={16} />
          {hasAnalysis ? 'Refresh Analysis' : 'Run First Analysis'}
        </button>
      </div>

      {!hasAnalysis ? <EmptyState /> : <FullDashboard data={data} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Let's build your financial dashboard</h2>
        <p className="text-gray-600 max-w-md mx-auto mb-4">
          First, fill in your financial profile from any module, then hit "Run First Analysis"
          to get personalized insights across all dimensions.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <ModuleLink to="/fire" icon={Flame} label="FIRE Planner" color="from-orange-500 to-red-500" />
          <ModuleLink to="/health" icon={Heart} label="Health Score" color="from-emerald-500 to-teal-500" />
          <ModuleLink to="/tax" icon={Calculator} label="Tax Wizard" color="from-indigo-500 to-purple-500" />
        </div>
      </div>
    </div>
  );
}

function ModuleLink({ to, icon: Icon, label, color }) {
  return (
    <Link to={to} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 hover:shadow-md transition-shadow">
      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon size={16} className="text-white" />
      </div>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <ChevronRight size={14} className="text-gray-400" />
    </Link>
  );
}

function FullDashboard({ data }) {
  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat
          icon={Target} label="FIRE Progress"
          value={data.goal_progress ? `${data.goal_progress.percent_complete}%` : '--'}
          sub={data.goal_progress ? `Target: ${formatCurrency(data.goal_progress.fire_number)}` : ''}
          color="text-indigo-600" bg="bg-indigo-50"
        />
        <QuickStat
          icon={Heart} label="Health Score"
          value={data.health_score ?? '--'}
          sub={data.health_zone || ''}
          color="text-emerald-600" bg="bg-emerald-50"
        />
        <QuickStat
          icon={Wallet} label="Net Worth"
          value={data.net_worth ? formatCurrency(data.net_worth.net) : '--'}
          sub={data.net_worth ? `Assets: ${formatCurrency(data.net_worth.assets)}` : ''}
          color="text-blue-600" bg="bg-blue-50"
        />
        <QuickStat
          icon={CircleDollarSign} label="Tax Saveable"
          value={data.tax_savings ? formatCurrency(data.tax_savings) : '--'}
          sub={data.recommended_regime ? `Best: ${data.recommended_regime} regime` : ''}
          color="text-purple-600" bg="bg-purple-50"
        />
      </div>

      {/* Next Actions */}
      {data.next_actions?.length > 0 && (
        <Section title="Next Actions" icon={Zap} iconColor="text-amber-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.next_actions.map((a, i) => (
              <div key={i} className={`border-l-4 rounded-lg p-4 ${PRIORITY_STYLES[a.priority]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-800">{a.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGES[a.priority]}`}>
                    {a.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{a.action}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Goal Progress + Net Worth side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.goal_progress && (
          <Section title="FIRE Goal Progress" icon={Target} iconColor="text-indigo-500">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">Progress to FIRE</span>
                  <span className="font-bold text-gray-900">{data.goal_progress.percent_complete}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(data.goal_progress.percent_complete, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Current Portfolio" value={formatCurrency(data.goal_progress.current_portfolio)} />
                <MiniStat label="FIRE Target" value={formatCurrency(data.goal_progress.fire_number)} />
                <MiniStat label="Projected Date" value={data.goal_progress.fire_date} />
                <MiniStat label="Real Return" value={formatPercent(data.goal_progress.blended_real_return)} />
              </div>
              {data.goal_progress.milestones_hit?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Milestones Achieved</p>
                  <div className="flex flex-wrap gap-2">
                    {data.goal_progress.milestones_hit.map((m, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={12} /> {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {data.net_worth && (
          <Section title="Net Worth" icon={Wallet} iconColor="text-blue-500">
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(data.net_worth.net)}</p>
                <p className="text-sm text-gray-500 mt-1">Total Net Worth</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-600 mb-1">Assets</p>
                  <p className="font-bold text-emerald-700">{formatCurrency(data.net_worth.assets)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 mb-1">Liabilities</p>
                  <p className="font-bold text-red-700">{formatCurrency(data.net_worth.liabilities)}</p>
                </div>
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* Monthly Plan */}
      {data.monthly_plan && (data.monthly_plan.sip_breakdown?.length > 0 || data.monthly_plan.tax_actions?.length > 0) && (
        <Section title="Monthly Plan" icon={Calendar} iconColor="text-teal-500">
          <div className="space-y-4">
            {data.monthly_plan.total_sip > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">SIP Investments</p>
                  <span className="text-sm font-bold text-gray-800">Total: {formatCurrency(data.monthly_plan.total_sip)}/mo</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {data.monthly_plan.sip_breakdown.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{s.asset_class}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">{formatCurrency(s.monthly_sip)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.monthly_plan.tax_actions?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Tax-Saving Actions</p>
                <div className="space-y-2">
                  {data.monthly_plan.tax_actions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-purple-50/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-gray-700">{t.name} <span className="text-xs text-gray-400">({t.section})</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(t.amount)}</p>
                        <p className="text-xs text-emerald-600">saves {formatCurrency(t.tax_saved)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Alerts + Market Context side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.alerts?.length > 0 && (
          <Section title="Alerts" icon={BadgeAlert} iconColor="text-red-500">
            <div className="space-y-2">
              {data.alerts.map((a, i) => (
                <div key={i} className={`border rounded-lg px-4 py-3 ${SEVERITY_STYLES[a.severity] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} />
                    <span className="font-semibold text-sm">{a.dimension}</span>
                    {a.score != null && <span className="text-xs opacity-75">({a.score}/100)</span>}
                  </div>
                  <p className="text-sm opacity-90">{a.message}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Market Context" icon={TrendingUp} iconColor="text-indigo-500">
          {data.economic ? (
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Inflation" value={formatPercent(data.economic.inflation_rate)} />
              <MiniStat label="GDP Growth" value={formatPercent(data.economic.gdp_growth)} />
              <MiniStat label="Interest Rate" value={formatPercent(data.economic.interest_rate)} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Market data unavailable</p>
          )}
        </Section>
      </div>

      {/* AI Insight */}
      {data.ai_insight && (
        <Section title="AI Insight" icon={Sparkles} iconColor="text-purple-500">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{data.ai_insight}</div>
        </Section>
      )}

      {/* Module links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModuleCard to="/fire" icon={Flame} label="FIRE Planner" desc="Detailed roadmap and SIP recommendations" color="from-orange-500 to-red-500" />
        <ModuleCard to="/health" icon={Heart} label="Health Score" desc="Full 6-dimension financial wellness check" color="from-emerald-500 to-teal-500" />
        <ModuleCard to="/tax" icon={Calculator} label="Tax Wizard" desc="Regime comparison and deduction optimizer" color="from-indigo-500 to-purple-500" />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={iconColor} />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function ModuleCard({ to, icon: Icon, label, desc, color }) {
  return (
    <Link to={to} className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon size={18} className="text-white" />
      </div>
      <h4 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{label}</h4>
      <p className="text-xs text-gray-500">{desc}</p>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-2">
        Open <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </span>
    </Link>
  );
}

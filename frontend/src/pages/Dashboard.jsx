import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Heart, Calculator, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react';
import { getMarketOverview } from '../api/client';
import { formatPercent } from '../utils/formatters';

const MODULES = [
  {
    to: '/fire',
    icon: Flame,
    title: 'FIRE Path Planner',
    desc: 'Build a month-by-month roadmap to Financial Independence with personalized SIP recommendations.',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
  },
  {
    to: '/health',
    icon: Heart,
    title: 'Money Health Score',
    desc: 'Get a comprehensive score across savings, debt, diversification, insurance, and retirement readiness.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
  },
  {
    to: '/tax',
    icon: Calculator,
    title: 'Tax Wizard',
    desc: 'Compare Old vs New regime, find the best deductions, and get a step-by-step tax-saving plan.',
    color: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
  },
];

export default function Dashboard() {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketOverview()
      .then((res) => setMarket(res.data))
      .catch(() => setMarket(null))
      .finally(() => setLoading(false));
  }, []);

  const hasSectors = market?.market?.sectors && Object.keys(market.market.sectors).length > 0;
  const hasEconomic = market?.economic;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AI Money Mentor
          </span>
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Transform complex financial planning into simple, personalized steps.
          Choose a module below to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {MODULES.map((mod) => (
          <Link
            key={mod.to}
            to={mod.to}
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
          >
            <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4`}>
              <mod.icon size={22} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
              {mod.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{mod.desc}</p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
              Get started <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-800">Market Overview</h3>
          </div>
          {loading && <RefreshCw size={16} className="text-gray-400 animate-spin" />}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {hasEconomic && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Economic Indicators</p>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Inflation Rate" value={formatPercent(market.economic.inflation_rate)} />
                  <Stat label="GDP Growth" value={formatPercent(market.economic.gdp_growth)} />
                  <Stat label="Interest Rate" value={formatPercent(market.economic.interest_rate)} />
                </div>
              </div>
            )}

            {hasSectors && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Sector Performance</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(market.market.sectors).map(([name, change]) => (
                    <div key={name} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-gray-500 truncate">{name}</p>
                      <p className={`font-semibold text-sm ${parseFloat(change) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {change}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasEconomic && !hasSectors && (
              <p className="text-sm text-gray-500 text-center py-4">
                Market data will appear here once the backend is connected.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-lg text-gray-800">{value}</p>
    </div>
  );
}

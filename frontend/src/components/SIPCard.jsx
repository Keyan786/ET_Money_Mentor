import { formatCurrency, formatPercent } from '../utils/formatters';
import { TrendingUp } from 'lucide-react';

const CLASS_COLORS = {
  equity: 'border-l-indigo-500 bg-indigo-50/30',
  debt: 'border-l-cyan-500 bg-cyan-50/30',
  gold: 'border-l-amber-500 bg-amber-50/30',
};

export default function SIPCard({ fund }) {
  const color = CLASS_COLORS[fund.asset_class] || 'border-l-gray-400';

  return (
    <div className={`rounded-lg border border-gray-200 border-l-4 ${color} p-4 animate-slide-up`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800 text-sm leading-tight pr-2">{fund.name}</h4>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
          {fund.asset_class}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div>
          <p className="text-xs text-gray-500">Monthly SIP</p>
          <p className="font-bold text-gray-900">{formatCurrency(fund.monthly_sip)}</p>
        </div>
        {fund.cagr_5y != null && (
          <div>
            <p className="text-xs text-gray-500">5Y CAGR</p>
            <p className="font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp size={14} />
              {formatPercent(fund.cagr_5y)}
            </p>
          </div>
        )}
        {fund.nav != null && (
          <div>
            <p className="text-xs text-gray-500">NAV</p>
            <p className="font-medium text-gray-700">{formatCurrency(fund.nav)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { formatCurrency } from '../utils/formatters';
import { ArrowRight, CheckCircle2, Shield, Droplets, Lock } from 'lucide-react';

const RISK_STYLES = {
  none: 'bg-gray-100 text-gray-600',
  low: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export default function TaxBreakdown({ oldRegime, newRegime, recommended, suggestions }) {
  if (!oldRegime || !newRegime) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RegimeCard regime={oldRegime} label="Old Regime" isRecommended={recommended === 'old'} />
        <RegimeCard regime={newRegime} label="New Regime" isRecommended={recommended === 'new'} />
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tax-Saving Opportunities</h3>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <ArrowRight size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{s.section}</span>
                  </div>
                  <p className="text-sm text-gray-600">{s.description}</p>
                  {(s.risk || s.liquidity || s.lock_in) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.risk && s.risk !== 'n/a' && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${RISK_STYLES[s.risk] || RISK_STYLES.moderate}`}>
                          <Shield size={10} /> Risk: {s.risk}
                        </span>
                      )}
                      {s.liquidity && s.liquidity !== 'n/a' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <Droplets size={10} /> Liquidity: {s.liquidity}
                        </span>
                      )}
                      {s.lock_in && s.lock_in !== 'n/a' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          <Lock size={10} /> Lock-in: {s.lock_in}
                        </span>
                      )}
                    </div>
                  )}
                  {s.potential_tax_saved > 0 && (
                    <p className="text-sm font-semibold text-emerald-600 mt-2">
                      Potential saving: {formatCurrency(s.potential_tax_saved)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegimeCard({ regime, label, isRecommended }) {
  return (
    <div className={`rounded-xl border p-5 ${isRecommended ? 'border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-200' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        {isRecommended && (
          <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={12} /> Recommended
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Gross Income" value={formatCurrency(regime.gross_income)} />
        <Row label="Total Deductions" value={formatCurrency(regime.total_deductions)} />
        <Row label="Taxable Income" value={formatCurrency(regime.taxable_income)} />
        <div className="pt-2 border-t border-gray-200">
          <Row label="Tax Payable" value={formatCurrency(regime.tax)} bold />
        </div>
        <p className="text-xs text-gray-500">Effective rate: {regime.effective_rate}%</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}>{value}</span>
    </div>
  );
}

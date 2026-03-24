import { useState } from 'react';
import { Heart, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateHealthScore } from '../api/client';
import { getScoreColor } from '../utils/formatters';
import ScoreGauge from '../components/ScoreGauge';
import InsightCard from '../components/InsightCard';

const INITIAL = {
  age: 30,
  monthly_income: 80000,
  monthly_expenses: 35000,
  total_debt: 5000,
  emergency_fund: 100000,
  insurance_coverage: 5000000,
  investments: {
    equity: 300000,
    debt: 100000,
    gold: 50000,
    real_estate: 0,
    crypto: 0,
  },
};

const DIM_LABELS = {
  savings_rate: 'Savings Rate',
  debt_health: 'Debt Health',
  emergency_preparedness: 'Emergency Preparedness',
  investment_diversification: 'Investment Diversification',
  insurance_adequacy: 'Insurance Adequacy',
  retirement_readiness: 'Retirement Readiness',
};

export default function HealthScore() {
  const [form, setForm] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleInvestment = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      investments: { ...prev.investments, [name]: Number(value) },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await calculateHealthScore(form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate score. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Heart size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Money Health Score</h1>
          <p className="text-sm text-gray-500">Comprehensive financial wellness check</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <Field label="Age" name="age" value={form.age} onChange={handleChange} />
          <Field label="Monthly Income (₹)" name="monthly_income" value={form.monthly_income} onChange={handleChange} />
          <Field label="Monthly Expenses (₹)" name="monthly_expenses" value={form.monthly_expenses} onChange={handleChange} />
          <Field label="Monthly Debt/EMIs (₹)" name="total_debt" value={form.total_debt} onChange={handleChange} />
          <Field label="Emergency Fund (₹)" name="emergency_fund" value={form.emergency_fund} onChange={handleChange} />
          <Field label="Life Insurance Coverage (₹)" name="insurance_coverage" value={form.insurance_coverage} onChange={handleChange} />
        </div>

        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Investment Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Field label="Equity (₹)" name="equity" value={form.investments.equity} onChange={handleInvestment} />
          <Field label="Debt (₹)" name="debt" value={form.investments.debt} onChange={handleInvestment} />
          <Field label="Gold (₹)" name="gold" value={form.investments.gold} onChange={handleInvestment} />
          <Field label="Real Estate (₹)" name="real_estate" value={form.investments.real_estate} onChange={handleInvestment} />
          <Field label="Crypto (₹)" name="crypto" value={form.investments.crypto} onChange={handleInvestment} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Calculating...</> : 'Calculate Health Score'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
            <div className="relative">
              <ScoreGauge score={result.overall_score} label={result.zone_label} />
            </div>
            <div className="mt-4 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(result.overall_score).bg} ${getScoreColor(result.overall_score).text}`}>
                {result.zone_label}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Dimension Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(result.dimensions).map(([key, dim]) => (
                <DimensionRow key={key} name={DIM_LABELS[key] || key} score={dim.score} advice={dim.advice} />
              ))}
            </div>
          </div>

          <InsightCard title="AI Health Summary" content={result.ai_summary} variant="success" />
        </div>
      )}
    </div>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
      />
    </div>
  );
}

function DimensionRow({ name, score, advice }) {
  const [open, setOpen] = useState(false);
  const { bg, text, stroke } = getScoreColor(score);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium text-gray-700">{name}</span>
            <span className={`text-sm font-bold ${text}`}>{score}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${score}%`, backgroundColor: stroke }}
            />
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className={`px-3 pb-3 text-sm ${bg} ${text} rounded-b-lg mx-2 mb-2 p-2`}>
          {advice}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Flame, Loader2, AlertTriangle } from 'lucide-react';
import { generateFirePlan, getProfile } from '../api/client';
import { formatCurrency, formatPercent } from '../utils/formatters';
import RoadmapTimeline from '../components/RoadmapTimeline';
import AllocationChart from '../components/AllocationChart';
import SIPCard from '../components/SIPCard';
import InsightCard from '../components/InsightCard';

export default function FirePlanner() {
  const [form, setForm] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProfile()
      .then(res => {
        const p = res.data;
        setForm({
          age: p.age || 30,
          target_age: p.target_age || 50,
          monthly_income: p.monthly_income || 0,
          monthly_expenses: p.monthly_expenses || 0,
          current_savings: p.current_savings || 0,
          current_investments: p.current_investments || 0,
          total_debt: p.monthly_emi || p.total_debt || 0,
          risk_tolerance: p.risk_tolerance || 'moderate',
        });
      })
      .catch(() => {
        setForm({
          age: 30, target_age: 50, monthly_income: 0, monthly_expenses: 0,
          current_savings: 0, current_investments: 0, total_debt: 0, risk_tolerance: 'moderate',
        });
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['risk_tolerance'].includes(name) ? value : Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await generateFirePlan(form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate plan. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading || !form) {
    return (
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Flame size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FIRE Path Planner</h1>
          <p className="text-sm text-gray-500">Plan your path to Financial Independence</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Field label="Your Age" name="age" value={form.age} onChange={handleChange} />
          <Field label="Target Retirement Age" name="target_age" value={form.target_age} onChange={handleChange} />
          <Field label="Monthly Income (₹)" name="monthly_income" value={form.monthly_income} onChange={handleChange} />
          <Field label="Monthly Expenses (₹)" name="monthly_expenses" value={form.monthly_expenses} onChange={handleChange} />
          <Field label="Current Savings (₹)" name="current_savings" value={form.current_savings} onChange={handleChange} />
          <Field label="Current Investments (₹)" name="current_investments" value={form.current_investments} onChange={handleChange} />
          <Field label="Monthly Debt/EMIs (₹)" name="total_debt" value={form.total_debt} onChange={handleChange} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Risk Tolerance</label>
            <select
              name="risk_tolerance"
              value={form.risk_tolerance}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="conservative">Conservative (30/60/10)</option>
              <option value="moderate">Moderate (60/30/10)</option>
              <option value="aggressive">Aggressive (80/15/5)</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Generating Plan...</> : 'Generate FIRE Plan'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-slide-up">
          {result.edge_case && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-semibold text-amber-800 mb-1">{result.edge_case.title}</h3>
              <p className="text-sm text-amber-700">{result.edge_case.message}</p>
              <p className="text-sm font-semibold text-amber-900 mt-2">Priority: {result.edge_case.priority_action}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="FIRE Number" value={formatCurrency(result.projections.fire_number)} />
            <StatCard label="Projected FIRE Date" value={result.projections.fire_date} />
            <StatCard label="Monthly SIP" value={formatCurrency(result.projections.monthly_sip)} />
            <StatCard label="Real Return" value={formatPercent(result.projections.blended_real_return)} sub={`Nominal: ${formatPercent(result.projections.blended_nominal_return)} | Inflation: ${formatPercent(result.projections.inflation_rate)}`} />
          </div>

          <RoadmapTimeline roadmap={result.roadmap} fireNumber={result.projections.fire_number} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AllocationChart allocation={result.allocation} />
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Emergency Fund Target</h3>
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.emergency_target)}</p>
                <p className="text-sm text-gray-500">6 months of expenses</p>
              </div>
            </div>
          </div>

          {result.sip_recommendations?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">SIP Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.sip_recommendations.map((fund, i) => (
                  <SIPCard key={i} fund={fund} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightCard title="AI Analysis" content={result.ai_insights?.summary} />
            <InsightCard title="Investment Explanation" content={result.ai_insights?.investment_explanation} />
          </div>
          {result.ai_insights?.risk_warning && (
            <InsightCard title="Risk Warnings" content={result.ai_insights.risk_warning} variant="warning" />
          )}
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
        type="number" name={name} value={value} onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

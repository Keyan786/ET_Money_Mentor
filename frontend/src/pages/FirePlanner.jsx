import { useState, useEffect } from 'react';
import { Flame, Loader2, AlertTriangle, Plus, Trash2, Target } from 'lucide-react';
import { generateFirePlan, getProfile, saveProfile } from '../api/client';
import { formatCurrency, formatPercent } from '../utils/formatters';
import RoadmapTimeline from '../components/RoadmapTimeline';
import AllocationChart from '../components/AllocationChart';
import SIPCard from '../components/SIPCard';
import InsightCard from '../components/InsightCard';

const EMPTY_GOAL = { name: '', type: 'target', category: 'medium', goal_age: '', target_amount: '' };

export default function FirePlanner() {
  const [form, setForm] = useState(null);
  const [goals, setGoals] = useState([]);
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
          monthly_emi: p.monthly_emi || 0,
          risk_tolerance: p.risk_tolerance || 'moderate',
        });
        const saved = p.goals || [];
        setGoals(saved.length > 0 ? saved : []);
      })
      .catch(() => {
        setForm({
          age: 30, target_age: 50, monthly_income: 0, monthly_expenses: 0,
          current_savings: 0, current_investments: 0, total_debt: 0, monthly_emi: 0,
          risk_tolerance: 'moderate',
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

  const addGoal = () => setGoals(prev => [...prev, { ...EMPTY_GOAL }]);
  const removeGoal = (i) => setGoals(prev => prev.filter((_, idx) => idx !== i));
  const updateGoal = (i, field, value) => {
    setGoals(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleanGoals = goals
        .filter(g => g.name && g.goal_age)
        .map(g => ({
          ...g,
          goal_age: Number(g.goal_age),
          target_amount: g.type === 'target' ? Number(g.target_amount || 0) : 0,
        }));

      saveProfile({ goals: cleanGoals }).catch(() => {});

      const res = await generateFirePlan({ ...form, goals: cleanGoals });
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

      <form onSubmit={handleSubmit} className="space-y-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">Financial Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Field label="Your Age" name="age" value={form.age} onChange={handleChange} />
            <Field label="Target Retirement Age" name="target_age" value={form.target_age} onChange={handleChange} />
            <Field label="Monthly Income (₹)" name="monthly_income" value={form.monthly_income} onChange={handleChange} />
            <Field label="Monthly Expenses (₹)" name="monthly_expenses" value={form.monthly_expenses} onChange={handleChange} />
            <Field label="Current Savings (₹)" name="current_savings" value={form.current_savings} onChange={handleChange} />
            <Field label="Current Investments (₹)" name="current_investments" value={form.current_investments} onChange={handleChange} />
            <Field label="Monthly Debt/EMIs (₹)" name="monthly_emi" value={form.monthly_emi} onChange={handleChange} />
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
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-700 text-sm">Financial Goals</h3>
              <p className="text-xs text-gray-400 mt-0.5">Add goals to split your monthly surplus across them</p>
            </div>
            <button
              type="button" onClick={addGoal}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No goals added. A default &quot;Retirement (FIRE)&quot; goal will be used automatically.
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map((g, i) => (
                <GoalRow key={i} goal={g} index={i} onUpdate={updateGoal} onRemove={removeGoal} />
              ))}
            </div>
          )}
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

          {/* Goal-wise SIP Split */}
          {result.goal_sips?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target size={16} className="text-indigo-500" /> Goal-wise SIP Allocation
              </h3>
              <div className="space-y-2.5">
                {result.goal_sips.map((gs, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        gs.category === 'high' ? 'bg-red-500' : gs.category === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{gs.name}</p>
                        <p className="text-xs text-gray-400">
                          {gs.type === 'target'
                            ? `Target: ${formatCurrency(gs.target_amount)} by age ${gs.goal_age}`
                            : `Until age ${gs.goal_age}`
                          }
                          {' · '}{gs.category} priority
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(gs.monthly_sip)}/mo</p>
                      {gs.type === 'target' && gs.required_sip > 0 && (
                        <p className="text-xs text-gray-400">Required: {formatCurrency(gs.required_sip)}/mo</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RoadmapTimeline roadmap={result.roadmap} fireNumber={result.projections.fire_number} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AllocationChart allocation={result.allocation} />
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Emergency Fund Target</h3>
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.emergency_target)}</p>
                <p className="text-sm text-gray-500">
                  {form.risk_tolerance === 'conservative' ? '9' : '6'} months of expenses
                </p>
              </div>
            </div>
          </div>

          {result.sip_recommendations?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Fund-level SIP Recommendations</h3>
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


function GoalRow({ goal, index, onUpdate, onRemove }) {
  return (
    <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1">Goal Name</label>
        <input
          type="text" value={goal.name} placeholder="e.g. Bike, House"
          onChange={e => onUpdate(index, 'name', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
      <div className="w-28">
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <select
          value={goal.type} onChange={e => onUpdate(index, 'type', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="target">Target</option>
          <option value="category">Priority</option>
        </select>
      </div>
      <div className="w-28">
        <label className="block text-xs text-gray-500 mb-1">Priority</label>
        <select
          value={goal.category} onChange={e => onUpdate(index, 'category', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div className="w-24">
        <label className="block text-xs text-gray-500 mb-1">Goal Age</label>
        <input
          type="number" value={goal.goal_age} placeholder="35"
          onChange={e => onUpdate(index, 'goal_age', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
      {goal.type === 'target' && (
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Target Amount (₹)</label>
          <input
            type="number" value={goal.target_amount} placeholder="10,00,000"
            onChange={e => onUpdate(index, 'target_amount', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      )}
      <button
        type="button" onClick={() => onRemove(index)}
        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 size={16} />
      </button>
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

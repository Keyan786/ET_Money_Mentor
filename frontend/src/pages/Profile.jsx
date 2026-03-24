import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, saveProfile } from '../api/client';
import {
  UserCircle, Save, Loader2, CheckCircle2, AlertCircle,
  User, Wallet, PiggyBank, CreditCard, Shield, Calculator, MessageCircle,
} from 'lucide-react';

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative (30% Equity / 60% Debt / 10% Gold)' },
  { value: 'moderate', label: 'Moderate (60% Equity / 30% Debt / 10% Gold)' },
  { value: 'aggressive', label: 'Aggressive (80% Equity / 15% Debt / 5% Gold)' },
];

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProfile()
      .then(res => {
        const p = res.data;
        setForm({
          age: p.age || 30,
          target_age: p.target_age || 50,
          risk_tolerance: p.risk_tolerance || 'moderate',
          monthly_income: p.monthly_income || 0,
          monthly_expenses: p.monthly_expenses || 0,
          current_savings: p.current_savings || 0,
          current_investments: p.current_investments || 0,
          equity_mf: p.investments?.equity_mf || 0,
          debt_funds: p.investments?.debt_funds || 0,
          gold: p.investments?.gold || 0,
          total_debt: p.total_debt || 0,
          monthly_emi: p.monthly_emi || 0,
          emergency_fund: p.emergency_fund || 0,
          insurance_coverage: p.insurance_coverage || 0,
          annual_income: p.annual_income || 0,
          section_80c: p.deductions?.section_80c || 0,
          section_80d: p.deductions?.section_80d || 0,
          nps: p.deductions?.nps || 0,
          hra: p.deductions?.hra || 0,
          additional_context: p.additional_context || '',
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        age: Number(form.age),
        target_age: Number(form.target_age),
        risk_tolerance: form.risk_tolerance,
        monthly_income: Number(form.monthly_income),
        monthly_expenses: Number(form.monthly_expenses),
        current_savings: Number(form.current_savings),
        current_investments: Number(form.current_investments),
        total_debt: Number(form.total_debt),
        monthly_emi: Number(form.monthly_emi),
        emergency_fund: Number(form.emergency_fund),
        insurance_coverage: Number(form.insurance_coverage),
        annual_income: Number(form.annual_income),
        investments: {
          equity_mf: Number(form.equity_mf),
          debt_funds: Number(form.debt_funds),
          gold: Number(form.gold),
        },
        deductions: {
          section_80c: Number(form.section_80c),
          section_80d: Number(form.section_80d),
          nps: Number(form.nps),
          hra: Number(form.hra),
        },
        additional_context: form.additional_context,
      };
      await saveProfile(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse mb-4" />
        ))}
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        Failed to load profile data.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <UserCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Update your financial details anytime</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
          <CheckCircle2 size={16} className="shrink-0" /> Profile updated successfully. Changes will reflect in your next dashboard refresh and module runs.
        </div>
      )}

      <div className="space-y-5">
        <Section icon={User} title="Basic Info" color="text-indigo-500">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Name</p>
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <p className="text-sm font-medium text-gray-800">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Field label="Age" value={form.age} onChange={(v) => update('age', v)} />
            <Field label="Target Retirement Age" value={form.target_age} onChange={(v) => update('target_age', v)} />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Risk Tolerance</label>
              <select
                value={form.risk_tolerance}
                onChange={(e) => update('risk_tolerance', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {RISK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section icon={Wallet} title="Income & Expenses" color="text-emerald-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly Income (₹)" value={form.monthly_income} onChange={(v) => update('monthly_income', v)} />
            <Field label="Monthly Expenses (₹)" value={form.monthly_expenses} onChange={(v) => update('monthly_expenses', v)} />
          </div>
        </Section>

        <Section icon={PiggyBank} title="Savings & Investments" color="text-amber-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Current Savings (₹)" value={form.current_savings} onChange={(v) => update('current_savings', v)} />
            <Field label="Total Investments (₹)" value={form.current_investments} onChange={(v) => update('current_investments', v)} />
          </div>
          <p className="text-xs font-medium text-gray-500 mb-2">Investment Breakdown</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Equity / MFs (₹)" value={form.equity_mf} onChange={(v) => update('equity_mf', v)} />
            <Field label="Debt / FDs (₹)" value={form.debt_funds} onChange={(v) => update('debt_funds', v)} />
            <Field label="Gold (₹)" value={form.gold} onChange={(v) => update('gold', v)} />
          </div>
        </Section>

        <Section icon={CreditCard} title="Debt & Liabilities" color="text-red-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Total Outstanding Debt (₹)" value={form.total_debt} onChange={(v) => update('total_debt', v)} />
            <Field label="Monthly EMI (₹)" value={form.monthly_emi} onChange={(v) => update('monthly_emi', v)} />
          </div>
        </Section>

        <Section icon={Shield} title="Safety Net" color="text-cyan-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Emergency Fund (₹)" value={form.emergency_fund} onChange={(v) => update('emergency_fund', v)} />
            <Field label="Insurance Coverage (₹)" value={form.insurance_coverage} onChange={(v) => update('insurance_coverage', v)} />
          </div>
        </Section>

        <Section icon={Calculator} title="Tax Details" color="text-purple-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Annual Income (₹)" value={form.annual_income} onChange={(v) => update('annual_income', v)} />
          </div>
          <p className="text-xs font-medium text-gray-500 mb-2">Deductions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Section 80C (₹)" value={form.section_80c} onChange={(v) => update('section_80c', v)} />
            <Field label="Section 80D (₹)" value={form.section_80d} onChange={(v) => update('section_80d', v)} />
            <Field label="NPS - 80CCD (₹)" value={form.nps} onChange={(v) => update('nps', v)} />
            <Field label="HRA Exemption (₹)" value={form.hra} onChange={(v) => update('hra', v)} />
          </div>
        </Section>

        <Section icon={MessageCircle} title="Additional Context for AI" color="text-pink-500">
          <textarea
            value={form.additional_context}
            onChange={(e) => update('additional_context', e.target.value)}
            rows={4}
            placeholder="Share your financial goals, concerns, or life plans for more personalized AI insights..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">This helps our AI tailor recommendations to your unique situation.</p>
        </Section>
      </div>

      <div className="mt-6 mb-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={color} />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>
  );
}

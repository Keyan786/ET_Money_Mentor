import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveProfile } from '../api/client';
import {
  ChevronRight, ChevronLeft, User, Wallet, PiggyBank,
  CreditCard, Shield, Calculator, MessageCircle, Sparkles,
  Check, Loader2, AlertCircle,
} from 'lucide-react';

const toNum = (v) => parseFloat(v) || 0;

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative', desc: 'Prefer stability, lower risk, steady returns', emoji: '🛡️' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced approach, some risk for better growth', emoji: '⚖️' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Comfortable with volatility for maximum growth', emoji: '🚀' },
];

const STEPS = [
  { key: 'basics', title: 'Basic Info', subtitle: "Let's start with the essentials", icon: User, color: 'from-indigo-500 to-blue-500' },
  { key: 'income', title: 'Income & Expenses', subtitle: "Tell me about your cash flow", icon: Wallet, color: 'from-emerald-500 to-teal-500' },
  { key: 'savings', title: 'Savings & Investments', subtitle: "What have you built so far?", icon: PiggyBank, color: 'from-amber-500 to-orange-500' },
  { key: 'debt', title: 'Debt & Liabilities', subtitle: "Any financial obligations?", icon: CreditCard, color: 'from-red-500 to-rose-500' },
  { key: 'safety', title: 'Safety Net', subtitle: "How protected are you?", icon: Shield, color: 'from-cyan-500 to-blue-500' },
  { key: 'tax', title: 'Tax Details', subtitle: "Let's optimize your taxes", icon: Calculator, color: 'from-purple-500 to-indigo-500' },
  { key: 'context', title: 'Your Story', subtitle: "Anything else we should know?", icon: MessageCircle, color: 'from-pink-500 to-rose-500' },
];

const DEFAULT_DATA = {
  age: 30, target_age: 50, risk_tolerance: 'moderate',
  monthly_income: '', monthly_expenses: '',
  current_savings: '', current_investments: '',
  equity: '', debt_inv: '', gold: '',
  total_debt: '', monthly_emi: '',
  emergency_fund: '', insurance_coverage: '',
  annual_income: '', section_80c: '', section_80d: '', nps: '', hra: '',
  additional_context: '',
};

function validateStep(step, data) {
  const missing = [];
  const val = (field, label) => {
    const v = data[field];
    if (v === '' || v === null || v === undefined) missing.push(label);
  };
  const posNum = (field, label) => {
    const v = data[field];
    if (v === '' || v === null || v === undefined || toNum(v) <= 0) missing.push(label);
  };

  switch (step) {
    case 0:
      posNum('age', 'Age');
      posNum('target_age', 'Target retirement age');
      if (!data.risk_tolerance) missing.push('Risk appetite');
      if (toNum(data.age) > 0 && toNum(data.target_age) > 0 && toNum(data.target_age) <= toNum(data.age))
        return 'Target retirement age must be greater than your current age.';
      break;
    case 1:
      posNum('monthly_income', 'Monthly income');
      posNum('monthly_expenses', 'Monthly expenses');
      break;
    case 2:
      val('current_savings', 'Current savings');
      val('current_investments', 'Total investments');
      break;
    case 3:
      val('total_debt', 'Total debt');
      val('monthly_emi', 'Monthly EMI');
      break;
    case 4:
      val('emergency_fund', 'Emergency fund');
      val('insurance_coverage', 'Insurance coverage');
      break;
    case 5:
      posNum('annual_income', 'Annual income');
      break;
    case 6:
      return null;
    default:
      break;
  }
  if (missing.length > 0) return `Please fill in: ${missing.join(', ')}`;
  return null;
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setError(null);
  }, [step]);

  const update = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const tryNext = () => {
    const err = validateStep(step, data);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => { setError(null); setStep(s => Math.max(s - 1, 0)); };
  const isLast = step === STEPS.length - 1;

  const handleFinish = async () => {
    setSaving(true);
    try {
      const payload = {
        age: toNum(data.age),
        target_age: toNum(data.target_age),
        risk_tolerance: data.risk_tolerance,
        monthly_income: toNum(data.monthly_income),
        monthly_expenses: toNum(data.monthly_expenses),
        current_savings: toNum(data.current_savings),
        current_investments: toNum(data.current_investments),
        total_debt: toNum(data.total_debt),
        monthly_emi: toNum(data.monthly_emi),
        emergency_fund: toNum(data.emergency_fund),
        insurance_coverage: toNum(data.insurance_coverage),
        annual_income: toNum(data.annual_income),
        investments: {
          equity_mf: toNum(data.equity),
          debt_funds: toNum(data.debt_inv),
          gold: toNum(data.gold),
        },
        deductions: {
          section_80c: toNum(data.section_80c),
          section_80d: toNum(data.section_80d),
          nps: toNum(data.nps),
          hra: toNum(data.hra),
        },
        additional_context: data.additional_context,
        onboarding_complete: true,
      };
      await saveProfile(payload);
      if (setUser && user) {
        setUser({ ...user, onboarding_complete: true });
      }
      navigate('/');
    } catch {
      setSaving(false);
    }
  };

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-950 to-indigo-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
            AI
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">Money Mentor</h1>
            <p className="text-xs text-gray-400">Financial Onboarding</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{step + 1} of {STEPS.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
          <div
            className="bg-gradient-to-r from-indigo-400 to-purple-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => {
                if (i > step) {
                  const err = validateStep(step, data);
                  if (err) { setError(err); return; }
                }
                setError(null);
                setStep(i);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? 'bg-indigo-400 w-6' : i < step ? 'bg-indigo-500/60' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in" key={step}>
            {/* Step header */}
            <div className={`bg-gradient-to-r ${currentStep.color} px-6 py-5`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <currentStep.icon size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{currentStep.title}</h2>
                  <p className="text-sm text-white/80">{currentStep.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Step content */}
            <div className="p-6">
              {step === 0 && <StepBasics data={data} update={update} />}
              {step === 1 && <StepIncome data={data} update={update} />}
              {step === 2 && <StepSavings data={data} update={update} />}
              {step === 3 && <StepDebt data={data} update={update} />}
              {step === 4 && <StepSafety data={data} update={update} />}
              {step === 5 && <StepTax data={data} update={update} />}
              {step === 6 && <StepContext data={data} update={update} user={user} />}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mt-4">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={prev}
                disabled={step === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>

              {isLast ? (
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {saving ? 'Setting up your dashboard...' : 'Launch My Dashboard'}
                </button>
              ) : (
                <button
                  onClick={tryNext}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Continue <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Q({ question, hint, required = true, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-sm font-semibold text-gray-800 mb-1">
        {question}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function NumInput({ value, onChange, prefix = '₹', placeholder, min, max }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{prefix}</span>
      )}
      <input
        type="number" value={value} onChange={(e) => onChange(e.target.value)}
        min={min} max={max} placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg ${prefix ? 'pl-8' : 'pl-4'} pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow`}
      />
    </div>
  );
}


function StepBasics({ data, update }) {
  return (
    <div className="space-y-1">
      <div className="bg-indigo-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-indigo-700">
          Hi there! I'm your AI Money Mentor. Let's get to know you so I can give you personalized financial guidance.
        </p>
      </div>

      <Q question="How old are you?" hint="This helps calculate your investment horizon">
        <NumInput value={data.age} onChange={(v) => update('age', v)} prefix="" placeholder="30" min={18} max={80} />
      </Q>

      <Q question="At what age would you like to achieve financial independence?" hint="Your FIRE target age">
        <NumInput value={data.target_age} onChange={(v) => update('target_age', v)} prefix="" placeholder="50" min={25} max={80} />
      </Q>

      <Q question="What's your risk appetite?" hint="This determines your asset allocation strategy">
        <div className="space-y-2">
          {RISK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update('risk_tolerance', opt.value)}
              className={`w-full text-left border rounded-lg px-4 py-3 transition-all ${
                data.risk_tolerance === opt.value
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{opt.emoji}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
                {data.risk_tolerance === opt.value && (
                  <Check size={18} className="ml-auto text-indigo-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Q>
    </div>
  );
}

function StepIncome({ data, update }) {
  const hasValues = data.monthly_income !== '' && data.monthly_expenses !== '';
  const surplus = hasValues ? toNum(data.monthly_income) - toNum(data.monthly_expenses) : null;

  return (
    <div className="space-y-1">
      <div className="bg-emerald-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-emerald-700">
          Understanding your cash flow is the foundation of any financial plan. Let's see how much you earn and spend.
        </p>
      </div>

      <Q question="What's your monthly take-home income?" hint="After taxes and deductions">
        <NumInput value={data.monthly_income} onChange={(v) => update('monthly_income', v)} placeholder="80,000" />
      </Q>

      <Q question="How much do you usually spend each month?" hint="Rent, food, bills, EMIs, everything">
        <NumInput value={data.monthly_expenses} onChange={(v) => update('monthly_expenses', v)} placeholder="40,000" />
      </Q>

      {surplus !== null && (
        <div className={`rounded-lg p-3 mt-2 ${surplus >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm font-medium ${surplus >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {surplus >= 0
              ? `Great! You have ₹${surplus.toLocaleString('en-IN')}/month available for savings and investments.`
              : `Heads up — you're spending more than you earn. Let's work on fixing that.`
            }
          </p>
        </div>
      )}
    </div>
  );
}

function StepSavings({ data, update }) {
  return (
    <div className="space-y-1">
      <div className="bg-amber-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-amber-700">
          Now let's understand what you've accumulated. This powers your net worth calculation and FIRE progress tracking.
        </p>
      </div>

      <Q question="How much do you have in savings?" hint="Bank savings, FDs, liquid funds">
        <NumInput value={data.current_savings} onChange={(v) => update('current_savings', v)} placeholder="5,00,000" />
      </Q>

      <Q question="Total value of your investments?" hint="Mutual funds, stocks, bonds, etc.">
        <NumInput value={data.current_investments} onChange={(v) => update('current_investments', v)} placeholder="3,00,000" />
      </Q>

      <Q question="How are your investments split?" hint="Approximate breakdown across asset classes" required={false}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Equity / MFs</label>
            <NumInput value={data.equity} onChange={(v) => update('equity', v)} placeholder="2,00,000" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Debt / FDs</label>
            <NumInput value={data.debt_inv} onChange={(v) => update('debt_inv', v)} placeholder="80,000" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gold</label>
            <NumInput value={data.gold} onChange={(v) => update('gold', v)} placeholder="20,000" />
          </div>
        </div>
      </Q>
    </div>
  );
}

function StepDebt({ data, update }) {
  return (
    <div className="space-y-1">
      <div className="bg-red-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-red-700">
          Don't worry — debt is normal. Understanding it helps me calculate your real financial picture and prioritize actions.
        </p>
      </div>

      <Q question="What's your total outstanding debt?" hint="Home loan, personal loan, credit card dues, etc.">
        <NumInput value={data.total_debt} onChange={(v) => update('total_debt', v)} placeholder="10,00,000" />
      </Q>

      <Q question="How much do you pay in EMIs each month?" hint="Total of all loan EMIs combined">
        <NumInput value={data.monthly_emi} onChange={(v) => update('monthly_emi', v)} placeholder="15,000" />
      </Q>

      {data.monthly_income && data.monthly_emi && (
        (() => {
          const ratio = (parseFloat(data.monthly_emi) / parseFloat(data.monthly_income) * 100);
          const isHealthy = ratio < 40;
          return (
            <div className={`rounded-lg p-3 mt-2 ${isHealthy ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm font-medium ${isHealthy ? 'text-emerald-700' : 'text-amber-700'}`}>
                Your debt-to-income ratio is {ratio.toFixed(0)}%.
                {isHealthy ? ' That\'s a healthy level.' : ' Ideally, keep this below 40%.'}
              </p>
            </div>
          );
        })()
      )}
    </div>
  );
}

function StepSafety({ data, update }) {
  const monthsOfCover = data.emergency_fund && data.monthly_expenses
    ? (parseFloat(data.emergency_fund) / parseFloat(data.monthly_expenses)).toFixed(1)
    : null;

  return (
    <div className="space-y-1">
      <div className="bg-cyan-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-cyan-700">
          A good safety net protects your financial plan from unexpected surprises. Let's check how prepared you are.
        </p>
      </div>

      <Q question="How much do you have in your emergency fund?" hint="Liquid cash set aside for emergencies only">
        <NumInput value={data.emergency_fund} onChange={(v) => update('emergency_fund', v)} placeholder="2,00,000" />
      </Q>

      {monthsOfCover && (
        <div className={`rounded-lg p-2.5 text-xs font-medium ${
          parseFloat(monthsOfCover) >= 6 ? 'bg-emerald-50 text-emerald-700' :
          parseFloat(monthsOfCover) >= 3 ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'
        }`}>
          That covers ~{monthsOfCover} months of expenses.
          {parseFloat(monthsOfCover) < 6 ? ' Aim for 6 months.' : ' Well done!'}
        </div>
      )}

      <Q question="What's your total life/health insurance coverage?" hint="Sum insured across all policies">
        <NumInput value={data.insurance_coverage} onChange={(v) => update('insurance_coverage', v)} placeholder="50,00,000" />
      </Q>
    </div>
  );
}

function StepTax({ data, update }) {
  return (
    <div className="space-y-1">
      <div className="bg-purple-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-purple-700">
          Let's get your tax details right. I'll compare Old vs New regime and find the best saving opportunities for you.
        </p>
      </div>

      <Q question="What's your total annual income (before taxes)?" hint="Gross salary / business income per year">
        <NumInput value={data.annual_income} onChange={(v) => update('annual_income', v)} placeholder="12,00,000" />
      </Q>

      <Q question="What are your current tax deductions?" hint="Enter yearly amounts for each section you claim" required={false}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Section 80C (ELSS, PPF, LIC)</label>
            <NumInput value={data.section_80c} onChange={(v) => update('section_80c', v)} placeholder="1,50,000" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Section 80D (Health Insurance)</label>
            <NumInput value={data.section_80d} onChange={(v) => update('section_80d', v)} placeholder="25,000" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">NPS (Section 80CCD)</label>
            <NumInput value={data.nps} onChange={(v) => update('nps', v)} placeholder="50,000" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">HRA Exemption</label>
            <NumInput value={data.hra} onChange={(v) => update('hra', v)} placeholder="1,00,000" />
          </div>
        </div>
      </Q>
    </div>
  );
}

function StepContext({ data, update, user }) {
  const suggestions = [
    "I want to buy a house in 3-5 years",
    "I'm planning for my child's education",
    "I want to start a business someday",
    "I'm worried about not saving enough for retirement",
    "I have a wedding coming up next year",
  ];

  return (
    <div className="space-y-1">
      <div className="bg-pink-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-pink-700">
          This is optional, but sharing your goals, concerns, or life plans helps me give you deeply personalized advice.
          Our AI will use this to tailor every recommendation just for you.
        </p>
      </div>

      <Q
        question={`${user?.name?.split(' ')[0] || 'Hey'}, is there anything else about your financial goals, concerns, or plans you'd like us to know for better mentorship?`}
        hint="Life goals, worries, upcoming events — anything that shapes your financial future"
        required={false}
      >
        <textarea
          value={data.additional_context}
          onChange={(e) => update('additional_context', e.target.value)}
          rows={4}
          placeholder="e.g., I'm planning to get married next year and want to buy a house within 5 years. I'm also a bit worried about market volatility..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-shadow"
        />
      </Q>

      <div>
        <p className="text-xs text-gray-400 mb-2">Quick suggestions (click to add):</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                const current = data.additional_context;
                const sep = current && !current.endsWith('.') && !current.endsWith('\n') ? '. ' : current ? ' ' : '';
                update('additional_context', current + sep + s);
              }}
              className="text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 px-3 py-1.5 rounded-full transition-colors border border-gray-200 hover:border-indigo-200"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mt-4 border border-indigo-100">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">You're all set!</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Click "Launch My Dashboard" below to see your personalized financial dashboard. You can update any of this information later from your profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

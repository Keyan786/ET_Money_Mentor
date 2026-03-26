import { useState, useEffect, useRef } from 'react';
import { Calculator, Loader2, AlertTriangle, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { optimizeTax, getProfile, uploadForm16 } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import TaxBreakdown from '../components/TaxBreakdown';
import InsightCard from '../components/InsightCard';

export default function TaxWizard() {
  const [form, setForm] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    getProfile()
      .then(res => {
        const p = res.data;
        const d = p.deductions || {};
        setForm({
          annual_income: p.annual_income || 0,
          deductions: {
            '80C': d.section_80c || 0,
            '80D': d.section_80d || 0,
            '80CCD': d.nps || 0,
            'HRA': d.hra || 0,
            '80E': d['80E'] || 0,
            '80G': d['80G'] || 0,
            '80TTA': d['80TTA'] || 0,
          },
          regime_preference: 'auto',
          risk_tolerance: p.risk_tolerance || 'moderate',
        });
      })
      .catch(() => {
        setForm({
          annual_income: 0,
          deductions: { '80C': 0, '80D': 0, '80CCD': 0, 'HRA': 0, '80E': 0, '80G': 0, '80TTA': 0 },
          regime_preference: 'auto',
          risk_tolerance: 'moderate',
        });
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'regime_preference' || name === 'risk_tolerance') {
      setForm((prev) => ({ ...prev, [name]: value }));
    } else if (name === 'annual_income') {
      setForm((prev) => ({ ...prev, annual_income: Number(value) }));
    }
  };

  const handleDeduction = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      deductions: { ...prev.deductions, [name]: Number(value) },
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const res = await uploadForm16(file, true);
      const parsed = res.data;
      setUploadResult(parsed);
      setForm(prev => ({
        ...prev,
        annual_income: parsed.gross_salary || prev.annual_income,
        deductions: {
          ...prev.deductions,
          '80C': parsed.deductions?.['80C'] || prev.deductions['80C'],
          '80D': parsed.deductions?.['80D'] || prev.deductions['80D'],
          '80CCD': parsed.deductions?.['80CCD'] || prev.deductions['80CCD'],
          'HRA': parsed.deductions?.['HRA'] || prev.deductions['HRA'],
          '80E': parsed.deductions?.['80E'] || prev.deductions['80E'],
          '80G': parsed.deductions?.['80G'] || prev.deductions['80G'],
          '80TTA': parsed.deductions?.['80TTA'] || prev.deductions['80TTA'],
        },
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse Form 16. Try manual input.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await optimizeTax(form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to optimize taxes. Is the backend running?');
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
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Wizard</h1>
          <p className="text-sm text-gray-500">Optimize your taxes with AI guidance</p>
        </div>
      </div>

      {/* Form 16 Upload */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <FileText size={18} className="text-indigo-500" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Upload Form 16</h3>
            <p className="text-xs text-gray-500">Auto-extract salary, HRA, and deductions from your Form 16 PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-white border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-50 transition-colors">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Parsing...' : 'Choose PDF'}
            <input
              ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={handleFileUpload} disabled={uploading}
            />
          </label>
          {uploadResult && !uploadResult.error && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={12} /> Form 16 parsed and applied
            </span>
          )}
        </div>
        {uploadResult && uploadResult.gross_salary > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Gross Salary</p>
              <p className="font-semibold text-gray-800">{formatCurrency(uploadResult.gross_salary)}</p>
            </div>
            {Object.entries(uploadResult.deductions || {}).map(([k, v]) =>
              v > 0 ? (
                <div key={k} className="bg-white rounded-lg p-2">
                  <p className="text-gray-400">{k}</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(v)}</p>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Annual Income (₹)</label>
            <input
              type="number" name="annual_income" value={form.annual_income} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Regime Preference</label>
            <select
              name="regime_preference" value={form.regime_preference} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="auto">Auto (Best for me)</option>
              <option value="old">Old Regime</option>
              <option value="new">New Regime</option>
            </select>
          </div>
        </div>

        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Current Deductions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Field label="Section 80C (₹)" name="80C" value={form.deductions['80C']} onChange={handleDeduction} />
          <Field label="Section 80D (₹)" name="80D" value={form.deductions['80D']} onChange={handleDeduction} />
          <Field label="NPS - 80CCD(1B) (₹)" name="80CCD" value={form.deductions['80CCD']} onChange={handleDeduction} />
          <Field label="HRA Exemption (₹)" name="HRA" value={form.deductions['HRA']} onChange={handleDeduction} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Field label="Education Loan 80E (₹)" name="80E" value={form.deductions['80E']} onChange={handleDeduction} />
          <Field label="Donations 80G (₹)" name="80G" value={form.deductions['80G']} onChange={handleDeduction} />
          <Field label="Savings Interest 80TTA (₹)" name="80TTA" value={form.deductions['80TTA']} onChange={handleDeduction} />
        </div>

        <button
          type="submit" disabled={loading}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Optimizing...</> : 'Optimize My Taxes'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Regime Savings</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.regime_savings)}</p>
              <p className="text-xs text-gray-400">by choosing {result.recommended_regime} regime</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Additional Tax Saveable</p>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(result.total_potential_tax_saved)}</p>
              <p className="text-xs text-gray-400">via suggested instruments</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Recommended Regime</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{result.recommended_regime}</p>
            </div>
          </div>

          <TaxBreakdown
            oldRegime={result.old_regime}
            newRegime={result.new_regime}
            recommended={result.recommended_regime}
            suggestions={result.suggestions}
          />

          <InsightCard title="AI Tax Strategy" content={result.ai_explanation} />
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

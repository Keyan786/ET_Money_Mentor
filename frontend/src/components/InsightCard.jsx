import { Sparkles } from 'lucide-react';

export default function InsightCard({ title, content, variant = 'default' }) {
  const variants = {
    default: 'border-indigo-200 bg-indigo-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
    success: 'border-emerald-200 bg-emerald-50/50',
  };

  const iconColors = {
    default: 'text-indigo-500',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
  };

  return (
    <div className={`rounded-xl border p-5 ${variants[variant]} animate-fade-in`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className={iconColors[variant]} />
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {content || 'Generating AI insights...'}
      </div>
    </div>
  );
}

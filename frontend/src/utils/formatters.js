export function formatCurrency(amount) {
  if (amount == null) return '---';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value, decimals = 1) {
  if (value == null) return '---';
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatNumber(value) {
  if (value == null) return '---';
  return new Intl.NumberFormat('en-IN').format(value);
}

export function getScoreColor(score) {
  if (score >= 71) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-500', stroke: '#10b981' };
  if (score >= 41) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-500', stroke: '#f59e0b' };
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500', stroke: '#ef4444' };
}

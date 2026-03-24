import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

export default function RoadmapTimeline({ roadmap, fireNumber }) {
  if (!roadmap || roadmap.length === 0) return null;

  const data = roadmap.map((r) => ({
    date: r.date,
    value: r.portfolio_value,
    milestone: r.milestones?.length ? r.milestones.join(', ') : null,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Portfolio Growth Projection</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval={Math.max(Math.floor(data.length / 8), 1)}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v) => formatCurrency(v)}
            labelStyle={{ fontWeight: 600 }}
          />
          {fireNumber && (
            <ReferenceLine
              y={fireNumber}
              stroke="#ef4444"
              strokeDasharray="6 4"
              label={{ value: 'FIRE Target', position: 'right', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

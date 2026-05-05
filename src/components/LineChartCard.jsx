import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EmptyState from './EmptyState';

export default function LineChartCard({ title, subtitle, data, dataKey = 'expense' }) {
  if (!data?.length) {
    return <EmptyState title={title} description="Add a few transactions to see spending trends here." />;
  }

  return (
    <div className="panel-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-ink">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-panel px-3 py-2 text-xs font-bold text-slate-700">Last 6 months</span>
      </div>

      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="financeArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F8F8C" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#0F8F8C" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EDF2F7" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6D7A90', fontSize: 12, fontWeight: 700 }} />
            <YAxis hide />
            <Tooltip formatter={(value) => [`INR ${Number(value).toLocaleString('en-IN')}`, 'Amount']} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#0F8F8C"
              strokeWidth={3}
              fill="url(#financeArea)"
              activeDot={{ r: 6, stroke: '#0F8F8C', fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

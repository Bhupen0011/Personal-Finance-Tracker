import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { categoryColors } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

export default function CategoryPieChartCard({ title, subtitle, data }) {
  const safeData = data?.length ? data : [];

  return (
    <div className="panel-card p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-ink">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>

      {safeData.length ? (
        <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] xl:grid-cols-[170px_minmax(0,1fr)]">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={safeData} dataKey="amount" nameKey="category" innerRadius={52} outerRadius={80} paddingAngle={2}>
                  {safeData.map((item) => (
                    <Cell key={item.category} fill={categoryColors[item.category] || '#0F8F8C'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {safeData.map((item) => (
              <div key={item.category} className="flex items-center gap-3 text-sm font-bold text-muted">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: categoryColors[item.category] || '#0F8F8C' }}
                />
                <span>
                  {item.category} - {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No expense categories yet. Start by logging an expense.</p>
      )}
    </div>
  );
}

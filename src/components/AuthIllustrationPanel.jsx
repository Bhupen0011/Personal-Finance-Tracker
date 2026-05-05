import { ArrowTrendingUpIcon, BanknotesIcon, ChartPieIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatters';

export default function AuthIllustrationPanel({ variant = 'login' }) {
  const isLogin = variant === 'login';

  return (
    <div
      className={`relative hidden overflow-hidden rounded-[36px] p-10 lg:flex lg:min-h-[840px] ${
        isLogin ? 'bg-authPanel text-white' : 'border border-white/60 bg-authPanelLight text-ink'
      }`}
    >
      <div className="relative z-10 flex w-full flex-col gap-6">
        <span
          className={`inline-flex w-fit rounded-[18px] px-4 py-2 text-sm font-bold ${
            isLogin ? 'bg-white/15 text-white backdrop-blur' : 'bg-white text-ink shadow-panel'
          }`}
        >
          {isLogin ? 'Live budget visibility' : 'Healthy finance habits'}
        </span>

        <div className={`rounded-[28px] border p-6 ${isLogin ? 'border-white/10 bg-white/10' : 'border-white bg-white shadow-panel'}`}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${isLogin ? 'text-white/80' : 'text-muted'}`}>Cash Flow</p>
              <h3 className="mt-1 text-2xl font-bold">{formatCurrency(124850)}</h3>
            </div>
            <span className="rounded-full bg-positiveSoft px-3 py-1 text-xs font-bold text-positive">+18.4%</span>
          </div>
          <div className="h-44 rounded-[24px] bg-white/10 p-4">
            <div className="flex h-full items-end gap-3">
              {[28, 36, 52, 48, 31, 61, 55].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col justify-end gap-2">
                  <div
                    className={`rounded-full ${isLogin ? 'bg-white/80' : 'bg-brand/80'}`}
                    style={{ height: `${height * 2}px` }}
                  />
                  <span className={`text-center text-[11px] font-semibold ${isLogin ? 'text-white/70' : 'text-muted'}`}>
                    {['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={BanknotesIcon}
            title={isLogin ? 'Total Balance' : 'Monthly Savings'}
            value={isLogin ? formatCurrency(124850) : formatCurrency(24400)}
            tone={isLogin ? 'light' : 'white'}
          />
          <FeatureCard
            icon={ChartPieIcon}
            title={isLogin ? 'Savings Goal' : 'Education Budget'}
            value={isLogin ? '78% achieved' : '68% used'}
            tone={isLogin ? 'light' : 'white'}
          />
        </div>

        {!isLogin && (
          <div className="grid gap-4 rounded-[28px] border border-white bg-white p-5 shadow-panel md:grid-cols-2">
            <FeatureCard icon={ArrowTrendingUpIcon} title="Income" value={formatCurrency(92500)} tone="panel" />
            <FeatureCard icon={ArrowTrendingUpIcon} title="Expenses" value={formatCurrency(56340)} tone="panel" negative />
          </div>
        )}
      </div>

      <div className={`absolute -bottom-16 left-10 h-48 w-48 rounded-full ${isLogin ? 'bg-white/10' : 'bg-brand/10'}`} />
      <div className={`absolute -right-10 top-16 h-60 w-60 rounded-full ${isLogin ? 'bg-white/10' : 'bg-accent/10'}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_22%)]" />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, value, tone, negative = false }) {
  const toneClass = {
    light: 'bg-white/90 text-ink shadow-panel',
    white: 'bg-white text-ink shadow-panel',
    panel: 'bg-panel text-ink',
  }[tone];

  return (
    <div className={`rounded-[18px] p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-brandSoft p-2 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold text-muted">{title}</span>
      </div>
      <p className={`text-xl font-bold ${negative ? 'text-negative' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../hooks/useAuth';

const defaultPreferences = {
  currency: 'INR',
  theme: 'light',
  budgetAlerts: true,
  weeklySummary: false,
};

export default function SettingsPage() {
  const { user, logout, updatePreferences } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        currency: user.preferences.currency || 'INR',
        theme: user.preferences.theme || 'light',
        budgetAlerts: user.preferences.notificationSettings?.budgetAlerts ?? true,
        weeklySummary: user.preferences.notificationSettings?.weeklySummary ?? false,
      });
      return;
    }

    const fallbackStored = JSON.parse(localStorage.getItem('pft-preferences') || 'null');
    if (fallbackStored) {
      setPreferences(fallbackStored);
    }
  }, [user]);

  const updatePreference = (field, value) => {
    setPreferences((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await updatePreferences({
        currency: preferences.currency,
        theme: preferences.theme,
        notificationSettings: {
          budgetAlerts: preferences.budgetAlerts,
          weeklySummary: preferences.weeklySummary,
        },
      });
      localStorage.setItem('pft-preferences', JSON.stringify(preferences));
      setSaved(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Account"
        title="Profile & Settings"
        actions={
          <button className="secondary-button" onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      {error && <p className="mt-5 rounded-2xl bg-negativeSoft px-4 py-3 text-sm font-semibold text-negative">{error}</p>}
      {saved && <p className="mt-5 rounded-2xl bg-positiveSoft px-4 py-3 text-sm font-semibold text-positive">Preferences saved locally for this browser.</p>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <div className="panel-card p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[linear-gradient(135deg,rgba(47,111,237,0.16),rgba(15,143,140,0.16))] text-2xl font-extrabold text-slate-700">
              {(user?.name || 'N S')
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink">{user?.name || 'Finance User'}</h2>
              <p className="text-sm text-muted">University project demo account</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <InfoRow label="Email" value={user?.email || 'user@example.com'} />
            <InfoRow label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '--'} />
            <InfoRow label="City" value="Mumbai" />
          </div>
        </div>

        <div className="panel-card p-6">
          <div>
            <h3 className="text-2xl font-bold text-ink">Preferences</h3>
            <p className="text-sm text-muted">Regional and display settings</p>
          </div>

          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="font-bold text-ink">Currency preference</p>
                <p className="text-sm text-muted">Set default currency for reports and dashboards</p>
              </div>
              <select className="input-field max-w-[120px]" value={preferences.currency} onChange={(event) => updatePreference('currency', event.target.value)}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <ToggleRow
              title="Theme"
              description="Light theme enabled by default for this design system."
              checked={preferences.theme === 'light'}
              onChange={(checked) => updatePreference('theme', checked ? 'light' : 'dark')}
            />
          </div>
        </div>

        <div className="panel-card p-6">
          <div>
            <h3 className="text-2xl font-bold text-ink">Notifications</h3>
            <p className="text-sm text-muted">Manage reminders and weekly summaries</p>
          </div>

          <div className="mt-6 space-y-5">
            <ToggleRow
              title="Budget alerts"
              description="Warn when category spending crosses 90%."
              checked={preferences.budgetAlerts}
              onChange={(checked) => updatePreference('budgetAlerts', checked)}
            />
            <ToggleRow
              title="Weekly email summary"
              description="Receive trends and savings insights every Sunday."
              checked={preferences.weeklySummary}
              onChange={(checked) => updatePreference('weeklySummary', checked)}
            />
          </div>
        </div>

        <div className="panel-card p-6">
          <div>
            <h3 className="text-2xl font-bold text-ink">Security</h3>
            <p className="text-sm text-muted">Protect account access</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-panel px-4 py-3 text-sm font-semibold text-muted">Two-factor authentication enabled</div>
            <div className="rounded-2xl bg-panel px-4 py-3 text-sm font-semibold text-muted">Last password update: 22 Feb 2026</div>
            <div className="flex gap-3">
              <button className="ghost-button" onClick={handleSave}>
                Change Password
              </button>
              <button className="secondary-button" onClick={logout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full transition ${checked ? 'bg-hero' : 'bg-slate-200'}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${checked ? 'right-1' : 'left-1'}`}
        />
      </button>
    </div>
  );
}

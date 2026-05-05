import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AuthPageLayout from '../components/AuthPageLayout';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(form);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to log in with those credentials.');
    }
  };

  return (
    <AuthPageLayout
      title="Welcome back"
      eyebrow="Personal Finance Tracker"
      description="Track spending, plan budgets, and review your financial progress in one place."
      variant="login"
      footerText="New here?"
      footerLinkLabel="Create an account"
      footerLinkTo="/signup"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Email address</span>
          <input
            type="email"
            className="input-field"
            placeholder="neha.sharma@campusmail.in"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Password</span>
          <input
            type="password"
            className="input-field"
            placeholder="Enter your password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </label>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-bold text-brand">
            Forgot password?
          </Link>
        </div>

        {error && <p className="rounded-2xl bg-negativeSoft px-4 py-3 text-sm font-semibold text-negative">{error}</p>}

        <button type="submit" className="primary-button w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </AuthPageLayout>
  );
}

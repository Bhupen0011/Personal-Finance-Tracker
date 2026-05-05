import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthPageLayout from '../components/AuthPageLayout';
import { useAuth } from '../hooks/useAuth';

export default function SignUpPage() {
  const { register, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account.');
    }
  };

  return (
    <AuthPageLayout
      title="Create your account"
      eyebrow="Get started"
      description="Build healthier habits with budgets, transaction tracking, and clear analytics."
      variant="signup"
      footerText="Already registered?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Full name</span>
          <input
            className="input-field"
            placeholder="e.g. Neha Sharma"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Email address</span>
          <input
            type="email"
            className="input-field"
            placeholder="neha.sharma@campusmail.in"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Password</span>
          <input
            type="password"
            className="input-field"
            placeholder="Create a password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
            autoComplete="new-password"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Confirm password</span>
          <input
            type="password"
            className="input-field"
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            required
            autoComplete="new-password"
          />
        </label>

        {error && <p className="rounded-2xl bg-negativeSoft px-4 py-3 text-sm font-semibold text-negative">{error}</p>}

        <button type="submit" className="primary-button w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthPageLayout>
  );
}

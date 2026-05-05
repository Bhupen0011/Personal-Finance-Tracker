import { useState } from 'react';
import AuthPageLayout from '../components/AuthPageLayout';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgotpassword', { email });
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to process your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Forgot Password"
      eyebrow="Personal Finance Tracker"
      description="Enter your email address and we'll send you a link to reset your password. (Check your backend terminal for the link!)"
      variant="login"
      footerText="Remembered your password?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      {success ? (
        <div className="rounded-2xl bg-positiveSoft px-4 py-3 text-sm font-semibold text-positive flex flex-col gap-2">
          <p>Password reset link sent! Normally this would go to your email inbox.</p>
          <p>For this local demo, please check the output in your <b>backend terminal</b> to find the secure reset link.</p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">Email address</span>
            <input
              type="email"
              className="input-field"
              placeholder="neha.sharma@campusmail.in"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {error && <p className="rounded-2xl bg-negativeSoft px-4 py-3 text-sm font-semibold text-negative">{error}</p>}

          <button type="submit" className="primary-button w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </AuthPageLayout>
  );
}

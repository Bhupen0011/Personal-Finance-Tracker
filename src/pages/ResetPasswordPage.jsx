import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthPageLayout from '../components/AuthPageLayout';
import api from '../services/api';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.put(`/auth/resetpassword/${token}`, { password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Reset Password"
      eyebrow="Personal Finance Tracker"
      description="Enter your new secure password below."
      variant="login"
      footerText="Remembered your password?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      {success ? (
        <div className="rounded-2xl bg-positiveSoft px-4 py-3 text-sm font-semibold text-positive flex flex-col gap-2">
          <p>Password reset successfully!</p>
          <p>Redirecting you to login...</p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">New Password</span>
            <input
              type="password"
              className="input-field"
              placeholder="Enter new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">Confirm Password</span>
            <input
              type="password"
              className="input-field"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>

          {error && <p className="rounded-2xl bg-negativeSoft px-4 py-3 text-sm font-semibold text-negative">{error}</p>}

          <button type="submit" className="primary-button w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
      )}
    </AuthPageLayout>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useStore } from '../context/StoreContext';
import { User } from '../types';

export const LoginPage: React.FC = () => {
  const { loginWithToken, showToast } = useStore();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('arjun.mehta@example.com');
  const [password, setPassword] = useState('Customer@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      await loginWithToken(res.data.token, res.data.user);
      showToast('Signed in successfully.', 'success');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Client Authentication</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">Sign In</h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Email or Phone Number</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-zinc-800">Password</label>
              <Link to="/forgot-password" className="text-zinc-500 hover:text-zinc-900 underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-100 text-xs text-zinc-600 flex items-center justify-between">
          <span>New to Aethelgard?</span>
          <Link to="/register" className="font-semibold text-zinc-900 underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { loginWithToken, showToast } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{
        token: string;
        user: User;
        sandboxOtpPreview: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password, confirmPassword }),
      });

      await loginWithToken(res.data.token, res.data.user);
      showToast(`Account created! Sandbox OTP: ${res.data.sandboxOtpPreview}`, 'success');
      navigate(`/verify?email=${encodeURIComponent(res.data.user.email)}&otp=${res.data.sandboxOtpPreview}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Collector Registration</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">Create Account</h1>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kabir Singhania"
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kabir@example.com"
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98200 00000"
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800"
          >
            {loading ? 'Creating Account...' : 'Create Account & Send OTP'}
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-100 text-xs text-zinc-600 flex items-center justify-between">
          <span>Already registered?</span>
          <Link to="/login" className="font-semibold text-zinc-900 underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export const VerifyOtpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, showToast } = useStore();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState(searchParams.get('otp') || '');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      await refreshUser();
      showToast(res.message, 'success');
      navigate('/profile');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await apiRequest<{ sandboxOtpPreview: string }>('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setOtp(res.data.sandboxOtpPreview);
      showToast(`New OTP generated: ${res.data.sandboxOtpPreview}`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Security Verification</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">Verify Email OTP</h1>
        </div>

        <form onSubmit={handleVerify} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">6-Digit OTP Code</label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md font-mono tracking-widest text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800"
          >
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          className="text-xs text-zinc-600 hover:text-zinc-900 underline"
        >
          Resend 6-digit OTP code
        </button>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [email, setEmail] = useState('arjun.mehta@example.com');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest<{ email: string; sandboxResetCode: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      showToast(`Reset code generated: ${res.data.sandboxResetCode}`, 'info');
      navigate(
        `/reset-password?email=${encodeURIComponent(res.data.email)}&token=${res.data.sandboxResetCode}`
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Account Recovery</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">Forgot Password</h1>
        </div>
        <form onSubmit={handleRequestReset} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Registered Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-md"
          >
            {loading ? 'Generating Code...' : 'Send Password Reset Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword, confirmPassword }),
      });
      showToast(res.message, 'success');
      navigate('/login');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Security Update</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">Reset Password</h1>
        </div>
        <form onSubmit={handleReset} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">6-Digit Reset Code</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-md"
          >
            {loading ? 'Updating Password...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

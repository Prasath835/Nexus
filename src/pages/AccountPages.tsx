import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, CheckCircle2, CreditCard, MapPin } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import { EmptyState } from '../components/common/UIElements';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, showToast, notifications, markNotificationsRead } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Saved Payment Method (Tokenized Reference Only — No Raw Card / CVV)
  const [pmType, setPmType] = useState<'Card' | 'UPI' | 'Wallet'>('Card');
  const [pmProvider, setPmProvider] = useState('Visa Infinite');
  const [pmLast4, setPmLast4] = useState('8841');
  const [pmUpi, setPmUpi] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-14">
        <EmptyState
          title="Sign in to manage your account"
          description="Update your personal profile, security credentials, delivery addresses, and tokenized payment methods."
          actionLabel="Sign In"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
      });
      await refreshUser();
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPassword(true);
      const res = await apiRequest('/users/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users/payment-methods', {
        method: 'POST',
        body: JSON.stringify({
          type: pmType,
          provider: pmProvider,
          last4: pmType === 'Card' ? pmLast4.slice(-4) : undefined,
          upiHandle: pmType === 'UPI' ? pmUpi : undefined,
          isDefault: true,
        }),
      });
      await refreshUser();
      setPmUpi('');
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      await apiRequest(`/users/payment-methods/${id}`, { method: 'DELETE' });
      await refreshUser();
      showToast('Saved payment method removed.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-10">
      <div className="border-b border-zinc-200 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-500 mb-1">
            Account &amp; Security · {user.isVerified ? 'Verified Email' : 'Unverified Email'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900">
            {user.name}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/addresses"
            className="px-4 py-2 font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
          >
            Manage Delivery Addresses ({user.addresses.length})
          </Link>
          {!user.isVerified && (
            <Link
              to={`/verify?email=${encodeURIComponent(user.email)}`}
              className="px-4 py-2 font-semibold border border-amber-400 bg-amber-50 text-amber-900 rounded-md"
            >
              Verify Email OTP
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Personal Info & Password */}
        <div className="lg:col-span-6 space-y-8">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 text-xs"
          >
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Personal Information
            </h2>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2 border border-zinc-200 bg-zinc-100 text-zinc-500 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 text-xs"
          >
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Change Password
            </h2>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-800 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 border border-zinc-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Right: Saved Tokenized Payment Methods & Notifications */}
        <div className="lg:col-span-6 space-y-8">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-700" />
              <h2 className="font-display text-xl font-semibold text-zinc-900">
                Saved Payment References
              </h2>
            </div>
            <p className="text-zinc-500">
              For PCI security compliance, raw card numbers and CVV codes are never transmitted or stored. Only safe payment-provider token references and last-4 display labels are persisted.
            </p>

            <div className="space-y-2.5">
              {user.savedPaymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="p-3.5 border border-zinc-200 rounded-md flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-zinc-900">
                      {pm.label} {pm.isDefault && '· Default'}
                    </div>
                    <div className="text-zinc-500 font-mono text-[11px]">
                      {pm.type} · Token: {pm.tokenReference}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePaymentMethod(pm.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddPaymentMethod}
              className="pt-4 border-t border-zinc-100 space-y-3"
            >
              <div className="font-semibold text-zinc-900">Link New Sandbox Payment Reference</div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={pmType}
                  onChange={(e) => setPmType(e.target.value as 'Card' | 'UPI' | 'Wallet')}
                  className="px-3 py-2 border border-zinc-300 rounded-md bg-white"
                >
                  <option value="Card">Tokenized Card (Last 4 Only)</option>
                  <option value="UPI">UPI Handle</option>
                  <option value="Wallet">Digital Wallet</option>
                </select>
                <input
                  type="text"
                  value={pmProvider}
                  onChange={(e) => setPmProvider(e.target.value)}
                  placeholder="Provider (e.g. Visa / HDFC)"
                  className="px-3 py-2 border border-zinc-300 rounded-md"
                />
              </div>

              {pmType === 'Card' && (
                <input
                  type="text"
                  maxLength={4}
                  value={pmLast4}
                  onChange={(e) => setPmLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="Last 4 digits only (e.g. 4242)"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md font-mono"
                />
              )}

              {pmType === 'UPI' && (
                <input
                  type="text"
                  required
                  value={pmUpi}
                  onChange={(e) => setPmUpi(e.target.value)}
                  placeholder="UPI VPA (e.g. collector@okhdfcbank)"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md"
                />
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-md"
              >
                Save Tokenized Reference
              </button>
            </form>
          </div>

          {/* Account Notifications */}
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-zinc-900">
                Notifications ({notifications.length})
              </h2>
              {notifications.some((n) => !n.isRead) && (
                <button
                  type="button"
                  onClick={markNotificationsRead}
                  className="text-zinc-600 hover:text-zinc-900 underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {notifications.length === 0 ? (
                <div className="text-zinc-500">No recent notifications.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-md border ${
                      n.isRead ? 'border-zinc-200 bg-white' : 'border-zinc-900 bg-zinc-900/5'
                    }`}
                  >
                    <div className="font-semibold text-zinc-900">{n.title}</div>
                    <div className="text-zinc-600 mt-0.5">{n.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AddressesPage: React.FC = () => {
  const { user, refreshUser, showToast } = useStore();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    house: '',
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    type: 'Home' as 'Home' | 'Work' | 'Other',
    isDefault: false,
  });

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-14">
        <EmptyState
          title="Sign in to manage delivery addresses"
          description="Add, edit, or set your default delivery destination."
          actionLabel="Sign In"
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: user.name,
      phone: user.phone,
      house: '',
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      type: 'Home',
      isDefault: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await apiRequest(`/users/addresses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        showToast(res.message, 'success');
      } else {
        const res = await apiRequest('/users/addresses', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        showToast(res.message, 'success');
      }
      await refreshUser();
      resetForm();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiRequest(`/users/addresses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
      });
      await refreshUser();
      showToast('Default delivery address updated.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/users/addresses/${id}`, { method: 'DELETE' });
      await refreshUser();
      showToast('Address deleted.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-10">
      <div className="border-b border-zinc-200 pb-6 flex items-end justify-between">
        <div>
          <Link to="/profile" className="text-xs text-zinc-500 hover:text-zinc-900">
            ← Back to Profile
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 mt-1">
            Delivery Addresses ({user.addresses.length})
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user.addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white border rounded-lg p-5 flex flex-col justify-between gap-4 text-xs ${
                addr.isDefault ? 'border-zinc-900' : 'border-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-900 inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {addr.name} · {addr.type}
                  </span>
                  {addr.isDefault && (
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Default
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 leading-relaxed">
                  {addr.house}, {addr.street}
                  <br />
                  {addr.area}, {addr.city}, {addr.state} —{' '}
                  <span className="font-mono font-semibold">{addr.pincode}</span>
                </p>
                <p className="text-zinc-500 mt-1">Phone: {addr.phone}</p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(addr.id);
                      setForm({
                        name: addr.name,
                        phone: addr.phone,
                        house: addr.house,
                        street: addr.street,
                        area: addr.area,
                        city: addr.city,
                        state: addr.state,
                        pincode: addr.pincode,
                        type: addr.type,
                        isDefault: addr.isDefault,
                      });
                    }}
                    className="font-semibold text-zinc-900 hover:underline"
                  >
                    Edit
                  </button>
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-zinc-600 hover:text-zinc-900 hover:underline"
                    >
                      Set Default
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-zinc-200 rounded-lg p-6 space-y-3 text-xs"
        >
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            {editingId ? 'Edit Address' : 'Add New Delivery Address'}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              required
              placeholder="Recipient Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md"
            />
            <input
              required
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>
          <input
            required
            placeholder="House / Flat / Building"
            value={form.house}
            onChange={(e) => setForm({ ...form, house: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input
              placeholder="Street / Road"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md"
            />
            <input
              placeholder="Area / Sector"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md"
            />
            <input
              required
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              required
              maxLength={6}
              placeholder="6-Digit Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="px-3 py-2 border border-zinc-300 rounded-md font-mono"
            />
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as 'Home' | 'Work' | 'Other' })
              }
              className="px-3 py-2 border border-zinc-300 rounded-md bg-white"
            >
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            <span>Set as default shipping address</span>
          </label>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-zinc-900 text-white font-semibold rounded-md hover:bg-zinc-800 inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Save Changes' : 'Save Address'}</span>
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 border border-zinc-300 rounded-md"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

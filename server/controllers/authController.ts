import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, savePersistentStore } from '../config/db';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthenticatedRequest, signToken } from '../middleware/auth';
import { IAddress, ISavedPaymentMethod, IUser } from '../models/schemas';

function sanitizeUser(user: IUser) {
  const { passwordHash, otpCode, otpExpiresAt, resetToken, resetTokenExpiresAt, ...safe } = user;
  return safe;
}

export async function registerUser(req: Request, res: Response) {
  const { name, email, phone, password, confirmPassword } = req.body;
  const errors: string[] = [];

  if (!name || String(name).trim().length < 2) errors.push('Full name must be at least 2 characters.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('Valid email address is required.');
  if (!phone || String(phone).trim().length < 8) errors.push('Valid phone number is required.');
  if (!password || String(password).length < 8) errors.push('Password must be at least 8 characters long.');
  if (password !== confirmPassword) errors.push('Password and confirm password do not match.');

  if (errors.length > 0) {
    return sendError(res, errors[0], 400, errors);
  }

  const db = getDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return sendError(res, 'An account with this email address already exists.', 409, ['Duplicate email address']);
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const newUser: IUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: String(name).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    passwordHash,
    role: 'customer',
    isVerified: false,
    isActive: true,
    otpCode,
    otpExpiresAt,
    addresses: [],
    savedPaymentMethods: [],
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: newUser.id,
    type: 'account',
    title: 'Welcome to Aethelgard Atelier',
    message: `Your verification OTP is ${otpCode} (valid for 10 minutes).`,
    isRead: false,
    createdAt: now,
  });
  savePersistentStore();

  const token = signToken(newUser);
  return sendSuccess(
    res,
    {
      token,
      user: sanitizeUser(newUser),
      verificationRequired: true,
      sandboxOtpPreview: otpCode,
    },
    'Account created. Please verify your email using the 6-digit OTP code.',
    201
  );
}

export async function loginUser(req: Request, res: Response) {
  const { identifier, email, password } = req.body;
  const loginId = String(identifier || email || '').trim().toLowerCase();

  if (!loginId || !password) {
    return sendError(res, 'Email/phone and password are required.', 400);
  }

  const db = getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === loginId || u.phone.replace(/\s+/g, '') === loginId.replace(/\s+/g, '')
  );

  if (!user) {
    return sendError(res, 'Invalid email/phone or password.', 401);
  }

  if (!user.isActive) {
    return sendError(res, 'Your account has been suspended by an administrator.', 403);
  }

  const isMatch = await bcrypt.compare(String(password), user.passwordHash);
  if (!isMatch) {
    return sendError(res, 'Invalid email/phone or password.', 401);
  }

  const token = signToken(user);
  return sendSuccess(res, { token, user: sanitizeUser(user) }, 'Signed in successfully.');
}

export async function adminLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 'Admin email and password are required.', 400);
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user || user.role !== 'admin') {
    return sendError(res, 'Invalid administrator credentials.', 401);
  }

  const isMatch = await bcrypt.compare(String(password), user.passwordHash);
  if (!isMatch) {
    return sendError(res, 'Invalid administrator credentials.', 401);
  }

  const token = signToken(user);
  return sendSuccess(res, { token, user: sanitizeUser(user) }, 'Administrator authenticated.');
}

export function verifyOtp(req: Request, res: Response) {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return sendError(res, 'Email and 6-digit OTP code are required.', 400);
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user) {
    return sendError(res, 'Account not found.', 404);
  }

  if (user.isVerified) {
    return sendSuccess(res, { user: sanitizeUser(user) }, 'Account is already verified.');
  }

  if (!user.otpCode || user.otpCode !== String(otp).trim()) {
    return sendError(res, 'Invalid OTP verification code.', 400);
  }

  if (!user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < Date.now()) {
    return sendError(res, 'OTP code has expired. Please request a new code.', 400);
  }

  user.isVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { user: sanitizeUser(user) }, 'Email verified successfully.');
}

export function resendOtp(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return sendError(res, 'Email address is required.', 400);
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user) {
    return sendError(res, 'Account not found.', 404);
  }

  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  user.otpCode = otpCode;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(
    res,
    { email: user.email, sandboxOtpPreview: otpCode, expiresInMinutes: 10 },
    'A fresh 6-digit verification OTP has been dispatched.'
  );
}

export function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return sendError(res, 'Please enter your registered email address.', 400);
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user) {
    return sendError(res, 'No account found with that email address.', 404);
  }

  const resetToken = String(Math.floor(100000 + Math.random() * 900000));
  user.resetToken = resetToken;
  user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(
    res,
    {
      email: user.email,
      sandboxResetCode: resetToken,
      expiresInMinutes: 15,
    },
    'Password reset code generated and sent to your email.'
  );
}

export async function resetPassword(req: Request, res: Response) {
  const { email, token, newPassword, confirmPassword } = req.body;
  if (!email || !token || !newPassword) {
    return sendError(res, 'Email, reset code, and new password are required.', 400);
  }

  if (String(newPassword).length < 8) {
    return sendError(res, 'New password must be at least 8 characters long.', 400);
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return sendError(res, 'New password and confirmation do not match.', 400);
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user || !user.resetToken || user.resetToken !== String(token).trim()) {
    return sendError(res, 'Invalid password reset code.', 400);
  }

  if (!user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt).getTime() < Date.now()) {
    return sendError(res, 'Password reset code has expired. Please request a new one.', 400);
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.resetToken = undefined;
  user.resetTokenExpiresAt = undefined;
  user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, {}, 'Password has been reset successfully. You may now sign in.');
}

export function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  return sendSuccess(res, { user: sanitizeUser(req.user) });
}

export function updateProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { name, phone, avatarUrl } = req.body;

  if (!name || String(name).trim().length < 2) {
    return sendError(res, 'Full name must be at least 2 characters.', 400);
  }

  req.user.name = String(name).trim();
  if (phone) req.user.phone = String(phone).trim();
  if (avatarUrl !== undefined) req.user.avatarUrl = String(avatarUrl).trim();
  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { user: sanitizeUser(req.user) }, 'Profile updated successfully.');
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current password and new password are required.', 400);
  }

  const isMatch = await bcrypt.compare(String(currentPassword), req.user.passwordHash);
  if (!isMatch) {
    return sendError(res, 'Current password is incorrect.', 400);
  }

  if (String(newPassword).length < 8) {
    return sendError(res, 'New password must be at least 8 characters long.', 400);
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return sendError(res, 'New password and confirmation do not match.', 400);
  }

  req.user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, {}, 'Password updated successfully.');
}

export function addAddress(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { name, phone, house, street, area, city, state, pincode, type, isDefault } = req.body;

  if (!name || !phone || !house || !city || !state || !pincode) {
    return sendError(res, 'Name, phone, house/flat, city, state, and pincode are required.', 400);
  }

  if (!/^[1-9][0-9]{5}$/.test(String(pincode).trim())) {
    return sendError(res, 'Pincode must be a valid 6-digit postal code.', 400);
  }

  const makeDefault = Boolean(isDefault) || req.user.addresses.length === 0;
  if (makeDefault) {
    req.user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  const newAddress: IAddress = {
    id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    name: String(name).trim(),
    phone: String(phone).trim(),
    house: String(house).trim(),
    street: String(street || '').trim(),
    area: String(area || '').trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
    type: type === 'Work' || type === 'Other' ? type : 'Home',
    isDefault: makeDefault,
  };

  req.user.addresses.push(newAddress);
  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { addresses: req.user.addresses, address: newAddress }, 'Delivery address saved.', 201);
}

export function updateAddress(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const addr = req.user.addresses.find((a) => a.id === id);
  if (!addr) {
    return sendError(res, 'Address not found.', 404);
  }

  const { name, phone, house, street, area, city, state, pincode, type, isDefault } = req.body;
  if (pincode && !/^[1-9][0-9]{5}$/.test(String(pincode).trim())) {
    return sendError(res, 'Pincode must be a valid 6-digit postal code.', 400);
  }

  if (name) addr.name = String(name).trim();
  if (phone) addr.phone = String(phone).trim();
  if (house) addr.house = String(house).trim();
  if (street !== undefined) addr.street = String(street).trim();
  if (area !== undefined) addr.area = String(area).trim();
  if (city) addr.city = String(city).trim();
  if (state) addr.state = String(state).trim();
  if (pincode) addr.pincode = String(pincode).trim();
  if (type === 'Home' || type === 'Work' || type === 'Other') addr.type = type;

  if (isDefault) {
    req.user.addresses.forEach((a) => {
      a.isDefault = a.id === id;
    });
  }

  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { addresses: req.user.addresses }, 'Address updated.');
}

export function deleteAddress(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const idx = req.user.addresses.findIndex((a) => a.id === id);
  if (idx === -1) {
    return sendError(res, 'Address not found.', 404);
  }

  const wasDefault = req.user.addresses[idx].isDefault;
  req.user.addresses.splice(idx, 1);
  if (wasDefault && req.user.addresses.length > 0) {
    req.user.addresses[0].isDefault = true;
  }

  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { addresses: req.user.addresses }, 'Address removed.');
}

export function addSavedPaymentMethod(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { type, provider, last4, expiryMonth, expiryYear, upiHandle, isDefault } = req.body;

  // SECURITY RULE: Never accept or store raw full card numbers or CVV
  if (req.body.cardNumber || req.body.cvv) {
    return sendError(
      res,
      'Security Policy Violation: Raw card numbers or CVV codes cannot be transmitted or stored.',
      400
    );
  }

  let label = '';
  if (type === 'Card') {
    const cleanLast4 = String(last4 || '0000').slice(-4);
    label = `${provider || 'Card'} •••• ${cleanLast4}`;
  } else if (type === 'UPI') {
    if (!upiHandle || !String(upiHandle).includes('@')) {
      return sendError(res, 'Valid UPI handle (e.g. name@bank) is required.', 400);
    }
    label = String(upiHandle).trim();
  } else {
    label = `${provider || 'Wallet'} Linked Account`;
  }

  const makeDefault = Boolean(isDefault) || req.user.savedPaymentMethods.length === 0;
  if (makeDefault) {
    req.user.savedPaymentMethods.forEach((pm) => {
      pm.isDefault = false;
    });
  }

  const method: ISavedPaymentMethod = {
    id: `pm_${Date.now()}`,
    type: type === 'UPI' || type === 'Wallet' ? type : 'Card',
    provider: String(provider || 'Sandbox Gateway'),
    label,
    last4: type === 'Card' ? String(last4 || '4242').slice(-4) : undefined,
    expiryMonth: type === 'Card' ? String(expiryMonth || '12') : undefined,
    expiryYear: type === 'Card' ? String(expiryYear || '2029') : undefined,
    upiHandle: type === 'UPI' ? String(upiHandle).trim() : undefined,
    tokenReference: `tok_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isDefault: makeDefault,
  };

  req.user.savedPaymentMethods.push(method);
  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(
    res,
    { savedPaymentMethods: req.user.savedPaymentMethods },
    'Tokenized payment reference saved.',
    201
  );
}

export function deleteSavedPaymentMethod(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const { id } = req.params;
  const idx = req.user.savedPaymentMethods.findIndex((pm) => pm.id === id);
  if (idx === -1) {
    return sendError(res, 'Saved payment method not found.', 404);
  }

  req.user.savedPaymentMethods.splice(idx, 1);
  if (req.user.savedPaymentMethods.length > 0 && !req.user.savedPaymentMethods.some((p) => p.isDefault)) {
    req.user.savedPaymentMethods[0].isDefault = true;
  }
  req.user.updatedAt = new Date().toISOString();
  savePersistentStore();

  return sendSuccess(res, { savedPaymentMethods: req.user.savedPaymentMethods }, 'Payment method removed.');
}

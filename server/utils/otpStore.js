// server/utils/otpStore.js
// Shared in-memory OTP store used by /api/otp routes and (optionally) other routes.
// NOTE: For production, replace with Redis or a database-backed store.

const otpStore = new Map();

const cleanupExpiredOtps = (now = Date.now()) => {
  for (const [key, data] of otpStore.entries()) {
    if (!data?.expiresAt || data.expiresAt < now) {
      otpStore.delete(key);
    }
  }
};

const setOtp = (identifier, data) => {
  const key = String(identifier || '').trim();
  if (!key) return;
  otpStore.set(key, data);
};

const getOtp = (identifier) => {
  const key = String(identifier || '').trim();
  if (!key) return null;
  return otpStore.get(key) || null;
};

const deleteOtp = (identifier) => {
  const key = String(identifier || '').trim();
  if (!key) return;
  otpStore.delete(key);
};

const verifyOtp = (identifier, otp, { consume = true } = {}) => {
  const key = String(identifier || '').trim();
  const code = String(otp || '').trim();

  cleanupExpiredOtps();

  if (!key) {
    return { success: false, message: 'Identifier is required' };
  }

  const stored = otpStore.get(key);
  if (!stored) {
    return {
      success: false,
      message: 'OTP expired or not found. Please request a new OTP.',
    };
  }

  const now = Date.now();
  if (stored.expiresAt && stored.expiresAt < now) {
    otpStore.delete(key);
    return { success: false, message: 'OTP has expired. Please request a new OTP.' };
  }

  if (!code) {
    return { success: false, message: 'OTP is required' };
  }

  if (String(stored.otp || '') !== code) {
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  if (consume) {
    otpStore.delete(key);
  }

  return { success: true, message: 'OTP verified successfully' };
};

export { otpStore, cleanupExpiredOtps, setOtp, getOtp, deleteOtp, verifyOtp };

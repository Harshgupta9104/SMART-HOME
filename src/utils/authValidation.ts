/**
 * Auth validation utilities
 * Pure functions for email and password validation
 */

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean => {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }

  if (!isValidEmail(email)) {
    return 'Enter a valid email address';
  }

  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  return null;
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): string | null => {
  if (!confirmPassword) {
    return 'Confirm password is required';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
};

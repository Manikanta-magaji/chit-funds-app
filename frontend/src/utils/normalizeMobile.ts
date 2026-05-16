/**
 * Normalize a raw mobile number input to a 10-digit Indian mobile number string.
 *
 * Strips spaces, dashes, parentheses, dots, and country code prefixes
 * (+91 / 91 / 0091 / leading 0 STD trunk).
 *
 * Returns the 10-digit string if valid, or null if the input cannot be
 * reduced to a valid 10-digit Indian mobile number (first digit 6–9).
 */
export function normalizeMobile(raw: string): string | null {
  // Strip all non-digit characters
  let digits = raw.replace(/\D/g, "");

  // Strip international prefix: +91 / 0091 → 12 digits starting with 91
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // Strip STD trunk prefix: 0 → 11 digits starting with 0
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Must be exactly 10 digits starting with 6, 7, 8, or 9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return digits;
  }

  return null;
}

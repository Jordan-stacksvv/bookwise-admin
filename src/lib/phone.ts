/** Normalises a Ghana number to 233XXXXXXXXX for wa.me links, or null if it doesn't look valid. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (/^0\d{9}$/.test(digits)) return "233" + digits.slice(1);
  if (/^233\d{9}$/.test(digits)) return digits;
  return null;
}

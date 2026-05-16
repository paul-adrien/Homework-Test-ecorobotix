const EM_DASH = "—";

/**
 * "Sat 15" — short locale-independent label for a daily row. ISO date is
 * parsed as UTC so the same date string appears regardless of the viewer's
 * timezone (the forecast is for the location, not the reader).
 */
export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Format a number with `decimals` fractional digits; null → em-dash. */
export function formatNumber(value: number | null, decimals = 0): string {
  if (value === null) return EM_DASH;
  return value.toFixed(decimals);
}

/**
 * "12/22" — daily min/max temperature range, no unit and no spaces around
 * the slash so the range stays compact enough to fit on one line inside a
 * narrow chip on mobile.
 */
export function formatTempRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return EM_DASH;
  return `${formatNumber(min)}/${formatNumber(max)}`;
}

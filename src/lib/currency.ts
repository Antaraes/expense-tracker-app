/**
 * Format a value in base/reporting currency using ISO 4217 (Intl).
 */
export function formatCurrencyCode(
  amount: number,
  currencyCode: string
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Format monetary amounts for display. Rounding at display layer per docs.
 */
export function formatMoney(
  amount: number,
  currencyCode: string,
  decimalPlaces: number,
  symbol: string
): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${formatted}`;
}

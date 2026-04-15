/**
 * Convert a ledger line to reporting currency using latest FX from Settings (`ratesToBase`),
 * falling back to stored `base_amount` when a currency pair is missing.
 */

export function lineAmountInBaseDisplay(
  amountStr: string,
  currencyCode: string,
  baseCurrency: string,
  ledgerBaseAmountStr: string,
  ratesToBase: Record<string, number> | undefined
): number {
  const amt = Number(amountStr);
  if (currencyCode === baseCurrency) return amt;
  const r = ratesToBase?.[currencyCode];
  if (r != null && r > 0 && Number.isFinite(r)) return amt * r;
  return Number(ledgerBaseAmountStr);
}

export function rowSpotBaseSum(
  lines:
    | Array<{
        amount: string;
        currency_code: string;
        base_amount: string;
      }>
    | undefined,
  baseCurrency: string,
  ratesToBase: Record<string, number> | undefined
): number {
  if (!lines?.length) return 0;
  let s = 0;
  for (const l of lines) {
    s += lineAmountInBaseDisplay(
      l.amount,
      l.currency_code,
      baseCurrency,
      l.base_amount,
      ratesToBase
    );
  }
  return s;
}

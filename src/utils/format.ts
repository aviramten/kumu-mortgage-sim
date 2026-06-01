/**
 * Central rounding to avoid IEEE 754 drift across 360 months of calculations.
 * Always compute at full precision; call this only when writing to output/state.
 */
export const roundMoney = (amount: number): number =>
  Math.round(amount * 100) / 100;

const currencyFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyWholeFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('he-IL', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Format to ₪ with agora precision — for monthly breakdown rows */
export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(roundMoney(amount));

/** Format to whole ₪ — for KPI aggregate values */
export const formatCurrencyWhole = (amount: number): string =>
  currencyWholeFormatter.format(Math.round(amount));

/** Format interest rate to 4 decimal places: 3.5500% */
export const formatPercent = (rate: number): string =>
  percentFormatter.format(rate / 100);

/** Format a plain number with thousand separators */
export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('he-IL').format(n);

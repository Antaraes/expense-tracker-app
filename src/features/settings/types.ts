export type LatestRateRow = {
  to_currency: string;
  rate: number | null;
  effective_date: string | null;
  source: string | null;
};

/** Points for sparklines (oldest → newest by calendar day). */
export type RateHistoryPoint = {
  date: string;
  rate: number;
  source: string | null;
};

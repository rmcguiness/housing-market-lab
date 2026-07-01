/** Shared formatting + colour helpers for the UI. */

export const usd = (n: number): string =>
  "$" + Math.round(n).toLocaleString("en-US");

export const usdCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return "$" + (n / 1_000).toFixed(0) + "k";
  return "$" + Math.round(n);
};

export const pct = (frac: number, digits = 1): string =>
  (frac * 100).toFixed(digits) + "%";

export const num = (n: number): string => Math.round(n).toLocaleString("en-US");

/**
 * Sequential palette for the five income quintiles, low → high. Chosen to read
 * as a clear "cool-poor → warm-rich" gradient that stays distinguishable for
 * common colour-vision deficiencies.
 */
export const BAND_COLORS = [
  "#4a6fa5", // Q1 lowest
  "#5a9aa8",
  "#6db58a",
  "#d8a657",
  "#d2691e", // Q5 highest
];

export const BAND_LABELS = [
  "Q1 · poorest 20%",
  "Q2",
  "Q3 · middle",
  "Q4",
  "Q5 · richest 20%",
];

/** Colours for the housing-stock fate composition (dynamics view). */
export const FATE_COLORS: Record<string, string> = {
  privateRented: "#6db58a",
  publicOccupied: "#7aa2e3",
  privateVacant: "#4a5564",
  ownerOccupied: "#c9a227",
  warehoused: "#b06fb0",
  abandoned: "#c25b58",
};

export const FATE_LABELS: Record<string, string> = {
  privateRented: "Private, rented",
  publicOccupied: "Public housing",
  privateVacant: "Private, vacant",
  ownerOccupied: "Owner-occupied (left rental)",
  warehoused: "Warehoused (held vacant)",
  abandoned: "Abandoned / decaying",
};

export const COLORS = {
  housed: "#6db58a",
  pricedOut: "#c25b58",
  profit: "#6db58a",
  loss: "#c25b58",
  withdrawn: "#7a6e8a",
  vacant: "#5b6472",
  demand: "#d2691e",
  supply: "#4a8fc4",
  consumer: "#5a9aa8",
  producer: "#d8a657",
  deadweight: "#c25b58",
  accent: "#7aa2e3",
};

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type Row = Record<string, string | number>;

/** Write an array of flat objects as a CSV file (columns taken from the first row). */
export function writeCsv(path: string, rows: Row[]): void {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]!);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c] ?? "")).join(",")),
  ];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n") + "\n");
}

/** Round to `d` decimals (keeps CSVs readable). */
export const r2 = (x: number, d = 2): number => {
  const p = 10 ** d;
  return Math.round(x * p) / p;
};

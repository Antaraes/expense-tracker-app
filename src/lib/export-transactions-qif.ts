import { rowSpotBaseSum } from "@/lib/spot-money";
import type { TransactionRow } from "@/features/transactions/transaction-list.types";
import { embedSingle } from "@/lib/utils";

function qifDate(d: string): string {
  const [y, m, day] = d.split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !m || !day) return d;
  const mm = String(m).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const yy = String(y).slice(-2);
  return `${mm}/${dd}'${yy}`;
}

/**
 * QIF export (Quicken interchange). One record per transaction; amounts in base currency.
 */
export function transactionsToQif(
  rows: TransactionRow[],
  baseCurrency: string,
  ratesToBase?: Record<string, number>
): string {
  const lines: string[] = [
    "!Type:Bank",
    `NUltraFinance export (${baseCurrency})`,
    "^",
  ];

  for (const row of rows) {
    if (row.type === "transfer") continue;
    const cat = embedSingle<{ name: string }>(row.categories);
    const memo = [row.description ?? "", cat?.name ? ` · ${cat.name}` : ""]
      .join("")
      .trim();
    const baseSum = rowSpotBaseSum(
      row.transaction_lines ?? [],
      baseCurrency,
      ratesToBase
    );
    const t = Number.isFinite(baseSum) ? baseSum.toFixed(2) : "0.00";
    lines.push(`D${qifDate(row.date)}`);
    lines.push(`T${t}`);
    lines.push(`P${memo || "Transaction"}`);
    lines.push(`M${row.type}`);
    lines.push("^");
  }

  return lines.join("\r\n");
}

export function downloadQif(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/qif;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

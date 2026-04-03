"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { csvEscape, saveTextFile } from "@/lib/export-file";
import { embedSingle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatQifDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
}

export function ExportSettingsActions() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function exportTransactionsCsv() {
    setMsg(null);
    setLoading("csv");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        type,
        date,
        description,
        notes,
        category_id,
        transaction_lines (amount, currency_code, base_amount)
      `
      )
      .order("date", { ascending: false })
      .limit(20_000);
    setLoading(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    const header = [
      "id",
      "type",
      "date",
      "description",
      "notes",
      "category_id",
      "base_sum",
    ];
    const lines = [header.join(",")];
    for (const t of data ?? []) {
      const tls = t.transaction_lines as { base_amount: string }[] | null;
      const baseSum = (tls ?? []).reduce(
        (s, l) => s + Number(l.base_amount),
        0
      );
      lines.push(
        [
          csvEscape(t.id),
          csvEscape(t.type),
          csvEscape(t.date),
          csvEscape(t.description ?? ""),
          csvEscape(t.notes ?? ""),
          csvEscape(t.category_id ?? ""),
          csvEscape(baseSum),
        ].join(",")
      );
    }
    const name = `ultrafinance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    const res = await saveTextFile(name, lines.join("\n"));
    setMsg(res.ok ? `Saved ${name}` : "Download started in browser.");
  }

  async function exportDetailedCsv() {
    setMsg(null);
    setLoading("detailed");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        type,
        date,
        description,
        notes,
        categories(name),
        transaction_lines(amount, currency_code, exchange_rate, base_amount, accounts(name))
      `
      )
      .order("date", { ascending: false })
      .limit(20_000);
    setLoading(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    const header = [
      "id",
      "type",
      "date",
      "description",
      "notes",
      "category_name",
      "lines_detail",
      "base_sum",
    ];
    const lines = [header.join(",")];
    for (const t of data ?? []) {
      const cat = embedSingle<{ name: string }>(
        (t as { categories?: unknown }).categories
      );
      const tls = t.transaction_lines as
        | {
            amount: string;
            currency_code: string;
            exchange_rate: string;
            base_amount: string;
            accounts: { name: string } | { name: string }[] | null;
          }[]
        | null;
      const parts: string[] = [];
      let baseSum = 0;
      for (const l of tls ?? []) {
        baseSum += Number(l.base_amount);
        const acc = embedSingle<{ name: string }>(l.accounts);
        parts.push(
          `${acc?.name ?? "?"}:${l.amount} ${l.currency_code} @${l.exchange_rate}→${l.base_amount}`
        );
      }
      lines.push(
        [
          csvEscape(t.id),
          csvEscape(t.type),
          csvEscape(t.date),
          csvEscape(t.description ?? ""),
          csvEscape(t.notes ?? ""),
          csvEscape(cat?.name ?? ""),
          csvEscape(parts.join(" | ")),
          csvEscape(baseSum),
        ].join(",")
      );
    }
    const name = `ultrafinance-transactions-detailed-${new Date().toISOString().slice(0, 10)}.csv`;
    const res = await saveTextFile(name, lines.join("\n"));
    setMsg(res.ok ? `Saved ${name}` : "Download started in browser.");
  }

  async function exportQif() {
    setMsg(null);
    setLoading("qif");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, type, date, description, transaction_lines(base_amount)"
      )
      .order("date", { ascending: false })
      .limit(20_000);
    setLoading(null);
    if (error) {
      setMsg(error.message);
      return;
    }
    const out: string[] = ["!Type:Bank"];
    for (const t of data ?? []) {
      const tls = t.transaction_lines as { base_amount: string }[] | null;
      const baseSum = (tls ?? []).reduce(
        (s, l) => s + Number(l.base_amount),
        0
      );
      out.push(`D${formatQifDate(t.date)}`);
      out.push(`T${baseSum}`);
      out.push(`P${(t.description ?? "").replace(/\n/g, " ")}`);
      out.push(`^`);
    }
    const name = `ultrafinance-${new Date().toISOString().slice(0, 10)}.qif`;
    const res = await saveTextFile(name, out.join("\n"));
    setMsg(res.ok ? `Saved ${name}` : "Download started in browser.");
  }

  async function exportBackupJson() {
    setMsg(null);
    setLoading("json");
    const supabase = createClient();
    const [txRes, accRes, catRes, budRes, recRes] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, type, date, description, notes, category_id, transaction_lines(*)"
        )
        .order("date", { ascending: false })
        .limit(20_000),
      supabase.from("accounts").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("budgets").select("*"),
      supabase.from("recurring_rules").select("*"),
    ]);
    setLoading(null);
    if (
      txRes.error ||
      accRes.error ||
      catRes.error ||
      budRes.error ||
      recRes.error
    ) {
      setMsg(
        txRes.error?.message ??
          accRes.error?.message ??
          catRes.error?.message ??
          budRes.error?.message ??
          recRes.error?.message ??
          "Export failed"
      );
      return;
    }
    const payload = {
      exported_at: new Date().toISOString(),
      transactions: txRes.data ?? [],
      accounts: accRes.data ?? [],
      categories: catRes.data ?? [],
      budgets: budRes.data ?? [],
      recurring_rules: recRes.data ?? [],
    };
    const name = `ultrafinance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await saveTextFile(name, JSON.stringify(payload, null, 2));
    setMsg(res.ok ? `Saved ${name}` : "Download started in browser.");
  }

  return (
    <Card className="max-w-2xl border-border">
      <CardHeader>
        <CardTitle>Export & backup</CardTitle>
        <CardDescription>
          CSV for spreadsheets; detailed CSV includes category and per-line
          accounts; QIF for basic imports; JSON backup adds budgets and recurring
          rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading !== null}
            onClick={() => void exportTransactionsCsv()}
          >
            {loading === "csv" ? "Exporting…" : "Transactions (CSV)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading !== null}
            onClick={() => void exportDetailedCsv()}
          >
            {loading === "detailed" ? "Exporting…" : "Detailed CSV"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading !== null}
            onClick={() => void exportQif()}
          >
            {loading === "qif" ? "Exporting…" : "QIF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading !== null}
            onClick={() => void exportBackupJson()}
          >
            {loading === "json" ? "Exporting…" : "Backup (JSON)"}
          </Button>
        </div>
        {msg ? (
          <p className="text-sm text-muted-foreground" role="status">
            {msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

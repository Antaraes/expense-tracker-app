"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { csvEscape, saveTextFile } from "@/lib/export-file";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  async function exportBackupJson() {
    setMsg(null);
    setLoading("json");
    const supabase = createClient();
    const [txRes, accRes, catRes] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, type, date, description, notes, category_id, transaction_lines(*)"
        )
        .order("date", { ascending: false })
        .limit(20_000),
      supabase.from("accounts").select("*"),
      supabase.from("categories").select("*"),
    ]);
    setLoading(null);
    if (txRes.error || accRes.error || catRes.error) {
      setMsg(
        txRes.error?.message ??
          accRes.error?.message ??
          catRes.error?.message ??
          "Export failed"
      );
      return;
    }
    const payload = {
      exported_at: new Date().toISOString(),
      transactions: txRes.data ?? [],
      accounts: accRes.data ?? [],
      categories: catRes.data ?? [],
    };
    const name = `ultrafinance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await saveTextFile(name, JSON.stringify(payload, null, 2));
    setMsg(res.ok ? `Saved ${name}` : "Download started in browser.");
  }

  return (
    <Card className="max-w-lg border-border">
      <CardHeader>
        <CardTitle>Export & backup</CardTitle>
        <CardDescription>
          CSV for spreadsheets; JSON includes transactions, accounts, and
          categories (ledger lines nested under transactions).
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
            {loading === "csv" ? "Exporting…" : "Export transactions (CSV)"}
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

"use client";

import { format } from "date-fns";
import { Download, Eye, Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TransactionsDataTable } from "@/features/transactions/components/transactions-data-table";
import type { TransactionRow } from "@/features/transactions/transaction-list.types";
import { transactionService } from "@/features/transactions/services/transactions.service";
import { rowSpotBaseSum } from "@/lib/spot-money";
import { embedSingle } from "@/lib/utils";

const STORAGE_KEY = "expense-tracker-transactions-table";

type TypeFilter = "all" | "expense" | "income" | "transfer";

type ColumnId =
  | "type"
  | "category"
  | "amount"
  | "date"
  | "accounts"
  | "created"
  | "updated";

const COLUMN_LABELS: Record<ColumnId, string> = {
  type: "Type",
  category: "Category",
  amount: "Amount",
  date: "Transaction date",
  accounts: "Account",
  created: "Created",
  updated: "Last updated",
};

const DEFAULT_VISIBILITY: Record<ColumnId, boolean> = {
  type: true,
  category: true,
  amount: true,
  date: true,
  accounts: true,
  created: true,
  updated: true,
};

const PAGE_SIZE_OPTIONS = [10, 16, 25, 50] as const;

function rowBaseSum(
  row: TransactionRow,
  baseCurrency: string,
  ratesToBase?: Record<string, number>
): number {
  return rowSpotBaseSum(row.transaction_lines, baseCurrency, ratesToBase);
}

function typeLabel(type: string): string {
  if (type === "expense") return "Expense";
  if (type === "income") return "Income";
  if (type === "transfer") return "Transfer";
  return type;
}

function accountSummary(row: TransactionRow): string {
  const lines = row.transaction_lines ?? [];
  const names = new Set<string>();
  for (const l of lines) {
    const acc = embedSingle<{ name: string }>(l.accounts);
    if (acc?.name) names.add(acc.name);
  }
  if (names.size === 0) return "—";
  if (names.size === 1) return [...names][0]!;
  return `${names.size} accounts`;
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(
  rows: TransactionRow[],
  baseCurrency: string,
  visibility: Record<ColumnId, boolean>,
  ratesToBase?: Record<string, number>
): string {
  const headers: string[] = ["ID", "Description"];
  if (visibility.type) headers.push("Type");
  if (visibility.category) headers.push("Category");
  if (visibility.amount) headers.push(`Amount (${baseCurrency})`);
  if (visibility.date) headers.push("Transaction date");
  if (visibility.accounts) headers.push("Account");
  if (visibility.created) headers.push("Created");
  if (visibility.updated) headers.push("Last updated");

  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    const cat = embedSingle<{ name: string }>(row.categories);
    const cells: string[] = [
      row.id,
      row.description ?? "",
    ];
    if (visibility.type) cells.push(typeLabel(row.type));
    if (visibility.category) cells.push(cat?.name ?? "");
    if (visibility.amount) {
      cells.push(
        row.type === "transfer"
          ? ""
          : String(rowBaseSum(row, baseCurrency, ratesToBase))
      );
    }
    if (visibility.date) cells.push(row.date);
    if (visibility.accounts) cells.push(accountSummary(row));
    if (visibility.created) cells.push(row.created_at);
    if (visibility.updated) cells.push(row.updated_at);
    lines.push(cells.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type TransactionsTableProps = {
  rows: TransactionRow[];
  baseCurrency: string;
  /** Latest FX multipliers from Settings; amounts use spot, else ledger base. */
  ratesToBase?: Record<string, number>;
  /** When false, skip the built-in H1 (use with `PageHeader` on the route). */
  showHeading?: boolean;
};

export function TransactionsTable({
  rows,
  baseCurrency,
  ratesToBase,
  showHeading = true,
}: TransactionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [visibility, setVisibility] =
    useState<Record<ColumnId, boolean>>(DEFAULT_VISIBILITY);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setPrefsLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        visibility?: Partial<Record<ColumnId, boolean>>;
        pageSize?: number;
      };
      if (parsed.visibility) {
        setVisibility((v) => ({ ...v, ...parsed.visibility }));
      }
      if (
        typeof parsed.pageSize === "number" &&
        PAGE_SIZE_OPTIONS.includes(parsed.pageSize as (typeof PAGE_SIZE_OPTIONS)[number])
      ) {
        setPageSize(parsed.pageSize);
      }
    } catch {
      /* ignore */
    }
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ visibility, pageSize })
      );
    } catch {
      /* ignore */
    }
  }, [visibility, pageSize, prefsLoaded]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (!q) return true;
      if (row.id.toLowerCase().includes(q)) return true;
      if ((row.description ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rows, search, typeFilter]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, typeFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pageIds = useMemo(() => pageSlice.map((r) => r.id), [pageSlice]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelectAllPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [allPageSelected, pageIds]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onExportCsv = useCallback(
    (subset: TransactionRow[]) => {
      const csv = rowsToCsv(subset, baseCurrency, visibility, ratesToBase);
      const stamp = format(new Date(), "yyyy-MM-dd");
      downloadCsv(csv, `transactions-${stamp}.csv`);
    },
    [baseCurrency, ratesToBase, visibility]
  );

  const executeDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeletingId(id);
    const { error } = await transactionService.remove(id);
    setDeletingId(null);
    setPendingDeleteId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        role="note"
      >
        <p className="font-medium text-foreground">How to use this list</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <span className="text-foreground">Search</span> matches description
            or full transaction ID—use it to jump to a specific entry.
          </li>
          <li>
            <span className="text-foreground">Filter</span> narrows rows by type
            (expense, income, transfer).
          </li>
          <li>
            <span className="text-foreground">Columns</span> lets you hide fields
            you do not need. Amounts are in {baseCurrency} using your latest
            saved exchange rates (Settings); if a pair is missing, the posted
            ledger value is used.
          </li>
          <li>
            Open a row (or use the menu) to review or edit; use{" "}
            <span className="text-foreground">Export</span> for a CSV of the
            current filtered set.
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {showHeading ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Ledger entries in {baseCurrency}. {total} shown
              {search.trim() || typeFilter !== "all" ? " after filters" : ""}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground sm:flex-1">
            {total} row{total === 1 ? "" : "s"}
            {search.trim() || typeFilter !== "all" ? " after filters" : ""} · {baseCurrency}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs sm:flex-initial">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by description or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
              aria-label="Search transactions"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Download className="size-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export as CSV</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onExportCsv(filtered)}
              >
                All matching filters ({filtered.length} rows)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExportCsv(pageSlice)}>
                This page only ({pageSlice.length} rows)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Filter className="size-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
              >
                <DropdownMenuRadioItem value="all">All types</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expense">Expense</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="income">Income</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="transfer">Transfer</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Eye className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show / hide</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(COLUMN_LABELS) as ColumnId[]).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibility[col]}
                  onCheckedChange={(checked) =>
                    setVisibility((v) => ({ ...v, [col]: Boolean(checked) }))
                  }
                >
                  {COLUMN_LABELS[col]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          <Button asChild size="sm" className="gap-1.5">
            <Link href="/transactions/new">
              <Plus className="size-4" />
              New
            </Link>
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No transactions match your search and filters.{" "}
          <Link
            href="/transactions/new"
            className="text-primary underline underline-offset-4"
          >
            Create one
          </Link>
          {" "}
          or clear filters.
        </p>
      ) : (
        <TransactionsDataTable
          data={filtered}
          baseCurrency={baseCurrency}
          ratesToBase={ratesToBase}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          visibility={visibility}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAllPage={toggleSelectAllPage}
          onRequestDelete={setPendingDeleteId}
          deletingId={deletingId}
        />
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The ledger will be updated to remove this
              entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pendingDeleteId != null && deletingId === pendingDeleteId}
              onClick={() => void executeDelete()}
            >
              {pendingDeleteId != null && deletingId === pendingDeleteId
                ? "Deleting…"
                : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

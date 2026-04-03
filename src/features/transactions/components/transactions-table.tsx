"use client";

import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransactionRow } from "@/features/transactions/transaction-list.types";
import { transactionService } from "@/features/transactions/services/transactions.service";
import { formatCurrencyCode } from "@/lib/currency";
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

function rowBaseSum(row: TransactionRow): number {
  const lines = row.transaction_lines ?? [];
  return lines.reduce((s, l) => s + Number(l.base_amount), 0);
}

function shortId(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 8)}`;
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

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

function buildPageList(
  current: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("ellipsis");
    out.push(n);
  }
  return out;
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(
  rows: TransactionRow[],
  baseCurrency: string,
  visibility: Record<ColumnId, boolean>
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
          : String(rowBaseSum(row))
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
};

export function TransactionsTable({ rows, baseCurrency }: TransactionsTableProps) {
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
  const somePageSelected = pageIds.some((id) => selected.has(id));

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
      const csv = rowsToCsv(subset, baseCurrency, visibility);
      const stamp = format(new Date(), "yyyy-MM-dd");
      downloadCsv(csv, `transactions-${stamp}.csv`);
    },
    [baseCurrency, visibility]
  );

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Delete this transaction? This cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(id);
    const { error } = await transactionService.remove(id);
    setDeletingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    router.refresh();
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageList = buildPageList(page, totalPages);

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
            you do not need; amounts are always in your base currency (
            {baseCurrency}).
          </li>
          <li>
            Open a row (or use the menu) to review or edit; use{" "}
            <span className="text-foreground">Export</span> for a CSV of the
            current filtered set.
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Ledger entries in {baseCurrency}. {total} shown
            {search.trim() || typeFilter !== "all" ? " after filters" : ""}.
          </p>
        </div>
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
        <>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10 pl-3">
                    <Checkbox
                      checked={
                        somePageSelected && !allPageSelected
                          ? "indeterminate"
                          : allPageSelected
                      }
                      onCheckedChange={() => toggleSelectAllPage()}
                      aria-label="Select all on this page"
                    />
                  </TableHead>
                  <TableHead className="min-w-[12rem]">Transaction</TableHead>
                  {visibility.type ? <TableHead>Type</TableHead> : null}
                  {visibility.category ? <TableHead>Category</TableHead> : null}
                  {visibility.amount ? (
                    <TableHead className="text-right">Amount</TableHead>
                  ) : null}
                  {visibility.date ? <TableHead>Date</TableHead> : null}
                  {visibility.accounts ? <TableHead>Account</TableHead> : null}
                  {visibility.created ? <TableHead>Created</TableHead> : null}
                  {visibility.updated ? <TableHead>Updated</TableHead> : null}
                  <TableHead className="w-10 pr-3 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageSlice.map((row) => {
                  const cat = embedSingle<{ name: string }>(row.categories);
                  const baseSum = rowBaseSum(row);
                  const checked = selected.has(row.id);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/transactions/${row.id}`)}
                    >
                      <TableCell className="pl-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label={`Select transaction ${shortId(row.id)}`}
                        />
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[20rem]">
                        <div className="font-medium leading-tight">
                          {row.description?.trim() || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {shortId(row.id)}
                        </div>
                      </TableCell>
                      {visibility.type ? (
                        <TableCell className="text-muted-foreground">
                          <span className="text-foreground">•</span>{" "}
                          {typeLabel(row.type)}
                        </TableCell>
                      ) : null}
                      {visibility.category ? (
                        <TableCell className="max-w-[10rem] truncate">
                          {cat?.name ?? "—"}
                        </TableCell>
                      ) : null}
                      {visibility.amount ? (
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {row.type === "transfer" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatCurrencyCode(baseSum, baseCurrency)
                          )}
                        </TableCell>
                      ) : null}
                      {visibility.date ? (
                        <TableCell className="text-muted-foreground">
                          {formatWhen(`${row.date}T12:00:00`)}
                        </TableCell>
                      ) : null}
                      {visibility.accounts ? (
                        <TableCell className="max-w-[12rem] truncate">
                          {accountSummary(row)}
                        </TableCell>
                      ) : null}
                      {visibility.created ? (
                        <TableCell className="text-muted-foreground">
                          {formatWhen(row.created_at)}
                        </TableCell>
                      ) : null}
                      {visibility.updated ? (
                        <TableCell className="text-muted-foreground">
                          {formatWhen(row.updated_at)}
                        </TableCell>
                      ) : null}
                      <TableCell
                        className="pr-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="Row actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="font-normal">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/transactions/${row.id}`}>View</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/transactions/${row.id}/edit`}>Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={deletingId === row.id}
                              onSelect={() => void handleDelete(row.id)}
                            >
                              {deletingId === row.id ? "Deleting…" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-[4.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="tabular-nums">
                Results: {rangeStart}–{rangeEnd} of {total}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <div className="flex items-center gap-0.5 px-1">
                {pageList.map((p, i) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e-${i}`}
                      className="px-2 text-muted-foreground"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      type="button"
                      variant={p === page ? "secondary" : "ghost"}
                      size="icon"
                      className="size-8 min-w-8"
                      onClick={() => setPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

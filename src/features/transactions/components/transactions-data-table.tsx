"use client";

import { format, parseISO } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransactionRow } from "@/features/transactions/transaction-list.types";
import { formatCurrencyCode } from "@/lib/currency";
import { embedSingle } from "@/lib/utils";

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

type ColumnVisibility = {
  type: boolean;
  category: boolean;
  amount: boolean;
  date: boolean;
  accounts: boolean;
  created: boolean;
  updated: boolean;
};

type TransactionsDataTableProps = {
  data: TransactionRow[];
  baseCurrency: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: readonly number[];
  visibility: ColumnVisibility;
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAllPage: () => void;
  onRequestDelete: (id: string) => void;
  deletingId: string | null;
};

export function TransactionsDataTable({
  data,
  baseCurrency,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  visibility,
  selected,
  onToggleRow,
  onToggleAllPage,
  onRequestDelete,
  deletingId,
}: TransactionsDataTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const rows = table.getPaginationRowModel().rows;
          const ids = rows.map((r) => r.original.id);
          const allSel =
            ids.length > 0 && ids.every((id) => selected.has(id));
          const someSel = ids.some((id) => selected.has(id));
          return (
            <Checkbox
              checked={
                someSel && !allSel ? "indeterminate" : allSel
              }
              onCheckedChange={() => onToggleAllPage()}
              aria-label="Select all on this page"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={() => onToggleRow(row.original.id)}
            aria-label={`Select transaction ${shortId(row.original.id)}`}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: "transaction",
        header: "Transaction",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[20rem]">
            <div className="font-medium leading-tight">
              {row.original.description?.trim() || "—"}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {shortId(row.original.id)}
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            <span className="text-foreground">•</span>{" "}
            {typeLabel(row.original.type)}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const cat = embedSingle<{ name: string }>(row.original.categories);
          return (
            <span className="max-w-[10rem] truncate">{cat?.name ?? "—"}</span>
          );
        },
      },
      {
        id: "amount",
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums">
            {row.original.type === "transfer" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatCurrencyCode(rowBaseSum(row.original), baseCurrency)
            )}
          </div>
        ),
      },
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatWhen(`${row.original.date}T12:00:00`)}
          </span>
        ),
      },
      {
        id: "accounts",
        header: "Account",
        cell: ({ row }) => (
          <span className="max-w-[12rem] truncate">
            {accountSummary(row.original)}
          </span>
        ),
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatWhen(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatWhen(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
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
              <DropdownMenuLabel className="font-normal">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/transactions/${row.original.id}`}>View</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/transactions/${row.original.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={deletingId === row.original.id}
                onSelect={() => onRequestDelete(row.original.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
      },
    ],
    [
      baseCurrency,
      selected,
      onToggleRow,
      onToggleAllPage,
      onRequestDelete,
      deletingId,
    ]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      columnVisibility: {
        type: visibility.type,
        category: visibility.category,
        amount: visibility.amount,
        date: visibility.date,
        accounts: visibility.accounts,
        created: visibility.created,
        updated: visibility.updated,
      },
    },
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize };
      const next =
        typeof updater === "function" ? updater(prev) : updater;
      if (next.pageSize !== prev.pageSize) {
        onPageSizeChange(next.pageSize);
        onPageChange(1);
      } else if (next.pageIndex !== prev.pageIndex) {
        onPageChange(next.pageIndex + 1);
      }
    },
    manualPagination: false,
  });

  const totalPages = Math.max(1, table.getPageCount());
  const pageList = buildPageList(page, totalPages);
  const total = data.length;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-muted/50 hover:bg-muted/50"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "amount" ? "text-right" : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No rows.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/transactions/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "select" || cell.column.id === "actions"
                          ? undefined
                          : undefined
                      }
                      onClick={(e) => {
                        if (
                          cell.column.id === "select" ||
                          cell.column.id === "actions"
                        ) {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
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
                const n = Number(v);
                onPageSizeChange(n);
                onPageChange(1);
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
                  onClick={() => onPageChange(p)}
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
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminVersionsService } from "@/features/versions/services/admin-versions.service";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/types/database.types";

type VersionRow = Database["public"]["Tables"]["app_versions"]["Row"];

export function AdminVersionsList() {
  const router = useRouter();
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await adminVersionsService.listAll();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((data ?? []) as VersionRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const { error: delErr } = await adminVersionsService.delete(pendingDeleteId);
    setPendingDeleteId(null);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    void load();
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">App versions</h1>
          <p className="text-sm text-muted-foreground">
            Published rows are used by the check-update Edge Function and in-app
            update banner.
          </p>
        </div>
        <Button type="button" asChild>
          <Link href="/admin/versions/new">Publish version</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All versions</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${rows.length} row(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-medium">{r.version}</span>
                    <span className="ml-2 text-muted-foreground">
                      {r.platform}{" "}
                      {r.is_published ? "· published" : "· draft"}{" "}
                      {r.is_critical ? "· critical" : ""} · rollout{" "}
                      {r.rollout_percentage}%
                    </span>
                    {r.published_at ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(r.published_at).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setPendingDeleteId(r.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this version row?</AlertDialogTitle>
            <AlertDialogDescription>
              Clients may still have this build installed; this only removes the
              registry entry for update checks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

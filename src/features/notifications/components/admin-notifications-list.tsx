"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { adminAnnouncementsService } from "@/features/notifications/services/admin-announcements.service";
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

type NotifRow = Database["public"]["Tables"]["notifications"]["Row"];

type RowWithStats = NotifRow & {
  read_count: number;
  dismiss_count: number;
};

export function AdminNotificationsList() {
  const router = useRouter();
  const [rows, setRows] = useState<RowWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } =
      await adminAnnouncementsService.listWithStats();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRows(data as RowWithStats[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const { error: delErr } =
      await adminAnnouncementsService.delete(pendingDeleteId);
    setPendingDeleteId(null);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    void load();
    router.refresh();
  }

  async function duplicate(id: string) {
    setDuplicatingId(id);
    setError(null);
    const { error: dupErr } = await adminAnnouncementsService.duplicate(id);
    setDuplicatingId(null);
    if (dupErr) {
      setError(dupErr.message);
      return;
    }
    void load();
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Read / dismiss counts; edit, duplicate, or delete rows.
          </p>
        </div>
        <Button type="button" asChild>
          <Link href="/admin/notifications/new">New announcement</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All notifications</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${rows.length} row(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{r.title}</span>
                    <span className="ml-2 text-muted-foreground">
                      [{r.status}] {r.type} · {r.priority}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      reads {r.read_count} · dismissals {r.dismiss_count}
                    </span>
                    {r.published_at ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Published {new Date(r.published_at).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href={`/admin/notifications/${r.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={duplicatingId === r.id}
                      onClick={() => void duplicate(r.id)}
                    >
                      <Copy className="mr-1 size-3.5" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingDeleteId(r.id)}
                    >
                      Delete
                    </Button>
                  </div>
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
            <AlertDialogTitle>Delete this notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Users who already saw it may still have
              read records until cleaned up.
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

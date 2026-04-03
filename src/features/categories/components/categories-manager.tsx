"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  categoryService,
  type CategoryType,
} from "@/features/categories/services/categories.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CategoryRow = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
  is_system: boolean;
  sort_order: number;
};

export function CategoriesManager({
  categories,
  userId,
}: {
  categories: CategoryRow[];
  userId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [parentId, setParentId] = useState("");
  const [color, setColor] = useState("#888888");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const mine = useMemo(
    () => categories.filter((c) => c.user_id === userId && !c.is_system),
    [categories, userId]
  );
  const system = useMemo(
    () => categories.filter((c) => c.is_system),
    [categories]
  );

  const parentCandidates = useMemo(() => {
    return categories.filter(
      (c) => c.type === type || c.type === "both" || type === "both"
    );
  }, [categories, type]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setLoading(true);
    const { error: err } = await categoryService.create({
      name: name.trim(),
      type,
      color,
      parent_id: parentId || null,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setName("");
    setParentId("");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this category? Transactions keep a null category if removed.")) {
      return;
    }
    const { error: err } = await categoryService.remove(id);
    if (err) {
      alert(err.message);
      return;
    }
    router.refresh();
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color ?? "#888888");
  }

  async function saveEdit() {
    if (!editingId) return;
    setLoading(true);
    const { error: err } = await categoryService.update(editingId, {
      name: editName.trim(),
      color: editColor || null,
    });
    setLoading(false);
    if (err) {
      alert(err.message);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium">System categories</h2>
        <p className="text-sm text-muted-foreground">
          Shared defaults — rename or delete from the database only.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {system.map((c) => (
            <li key={c.id}>
              <Badge variant="outline" className="gap-1 capitalize">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: c.color ?? "#ccc" }}
                  aria-hidden
                />
                {c.name}
                <span className="text-muted-foreground">({c.type})</span>
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <Card className="max-w-xl border-border">
        <CardHeader>
          <CardTitle>Your categories</CardTitle>
          <CardDescription>
            Custom categories are private to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((c) =>
                editingId === c.id ? (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
                  >
                    <div className="space-y-1">
                      <Label htmlFor={`n-${c.id}`}>Name</Label>
                      <Input
                        id={`n-${c.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`co-${c.id}`}>Color</Label>
                      <Input
                        id={`co-${c.id}`}
                        type="color"
                        className="h-9 w-14 p-1"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                      />
                    </div>
                    <Button type="button" size="sm" onClick={saveEdit} disabled={loading}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </li>
                ) : (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: c.color ?? "#ccc" }}
                        aria-hidden
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs capitalize text-muted-foreground">
                        {c.type}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(c)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          <form onSubmit={onCreate} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">Add category</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new-name">Name</Label>
                <Input
                  id="new-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Subscriptions"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-type">Type</Label>
                <select
                  id="new-type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as CategoryType)}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="new-parent">Parent (optional)</Label>
                <select
                  id="new-parent"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">None — top level</option>
                  {parentCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.is_system ? " (system)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-color">Color</Label>
              <Input
                id="new-color"
                type="color"
                className="h-9 w-20 p-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add category"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

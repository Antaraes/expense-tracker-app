"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { transactionService } from "@/features/transactions/services/transactions.service";

export function TransactionDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        "Delete this transaction? This cannot be undone."
      )
    ) {
      return;
    }
    setLoading(true);
    const { error } = await transactionService.remove(id);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.push("/transactions");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={loading}
      onClick={onDelete}
    >
      {loading ? "Deleting…" : "Delete"}
    </Button>
  );
}

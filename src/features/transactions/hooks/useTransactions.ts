"use client";

import { useEffect, useState } from "react";
import { transactionService } from "@/features/transactions/services/transactions.service";

export function useTransactions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void transactionService
      .listRecent()
      .then(({ error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, error };
}

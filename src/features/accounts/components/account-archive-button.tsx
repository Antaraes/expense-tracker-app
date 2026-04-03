"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { accountService } from "@/features/accounts/services/accounts.service";
import { profilesService } from "@/features/profiles/services/profiles.service";
import { Button } from "@/components/ui/button";

export function AccountArchiveButton({
  accountId,
  defaultAccountId,
}: {
  accountId: string;
  defaultAccountId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onArchive() {
    if (
      !confirm(
        "Archive this account? It will disappear from active lists; ledger history is kept."
      )
    ) {
      return;
    }
    setLoading(true);
    if (defaultAccountId === accountId) {
      await profilesService.updateMine({ default_account_id: null });
    }
    const { error } = await accountService.archive(accountId);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.push("/accounts");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={loading}
      onClick={onArchive}
    >
      {loading ? "Archiving…" : "Archive account"}
    </Button>
  );
}

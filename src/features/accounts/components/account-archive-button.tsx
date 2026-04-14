"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { accountService } from "@/features/accounts/services/accounts.service";
import { profilesService } from "@/features/profiles/services/profiles.service";

export function AccountArchiveButton({
  accountId,
  defaultAccountId,
}: {
  accountId: string;
  defaultAccountId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onArchive() {
    setLoading(true);
    if (defaultAccountId === accountId) {
      await profilesService.updateMine({ default_account_id: null });
    }
    const { error } = await accountService.archive(accountId);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    router.push("/accounts");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        {loading ? "Archiving…" : "Archive account"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this account?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from active lists; ledger history is kept and
              balances stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => void onArchive()}
            >
              {loading ? "Archiving…" : "Archive"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

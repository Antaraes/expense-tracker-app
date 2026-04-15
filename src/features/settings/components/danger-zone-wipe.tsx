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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { profilesService } from "@/features/profiles/services/profiles.service";

export function DangerZoneWipe() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setStep(1);
  }

  async function onWipe() {
    setLoading(true);
    const { error } = await profilesService.wipeFinanceData();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    handleOpenChange(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="max-w-lg border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Remove every transaction, account, and custom category. System
          categories and your profile row remain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="destructive"
          disabled={loading}
          onClick={() => {
            setStep(1);
            setOpen(true);
          }}
        >
          {loading ? "Wiping…" : "Wipe all finance data"}
        </Button>
      </CardContent>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          {step === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Wipe all finance data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes ALL transactions, accounts, and your custom
                  categories. Your login and profile stay; system categories
                  remain. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button type="button" onClick={() => setStep(2)}>
                  Continue
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Final confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to permanently remove all ledger data for this
                  account. If you are sure, confirm below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void onWipe()}
                >
                  {loading ? "Wiping…" : "Wipe everything"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { profilesService } from "@/features/profiles/services/profiles.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DangerZoneWipe() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onWipe() {
    if (
      !confirm(
        "Delete ALL transactions, accounts, and your custom categories? This cannot be undone. Your profile and login stay."
      )
    ) {
      return;
    }
    if (!confirm("Type-level confirm: really wipe all finance data?")) {
      return;
    }
    setLoading(true);
    const { error } = await profilesService.wipeFinanceData();
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
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
          onClick={() => void onWipe()}
        >
          {loading ? "Wiping…" : "Wipe all finance data"}
        </Button>
      </CardContent>
    </Card>
  );
}

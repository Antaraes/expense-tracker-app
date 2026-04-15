"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 no-print"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      Print
    </Button>
  );
}

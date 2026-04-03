"use client";

import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="no-print"
      onClick={() => window.print()}
    >
      Print / Save as PDF
    </Button>
  );
}

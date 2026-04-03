import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: ReactNode;
  variant?: "default" | "success" | "destructive" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variant === "default" && "border-border bg-secondary text-secondary-foreground",
        variant === "success" && "border-transparent bg-emerald-950/50 text-success",
        variant === "destructive" && "border-transparent bg-destructive/15 text-destructive",
        variant === "outline" && "border-border text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

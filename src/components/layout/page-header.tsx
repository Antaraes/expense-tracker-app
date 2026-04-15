import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Primary page title + description for dashboard surfaces. Establishes visual hierarchy
 * (“what is this screen for?”) per UX guidance.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-7",
        className
      )}
    >
      <div className="space-y-3">
        <div
          className="h-1 w-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/50 shadow-sm shadow-primary/25"
          aria-hidden
        />
        <div className="space-y-1.5">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">{actions}</div>
      ) : null}
    </div>
  );
}

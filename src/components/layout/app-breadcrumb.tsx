"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  buildBreadcrumbFromPathname,
  type BreadcrumbItem as Crumb,
} from "@/lib/breadcrumb";
import { cn } from "@/lib/utils";

export type AppBreadcrumbProps = {
  /** When set, pathname-based crumbs are ignored (e.g. custom flows). */
  items?: Crumb[];
  className?: string;
};

export function AppBreadcrumb({ items: itemsProp, className }: AppBreadcrumbProps) {
  const pathname = usePathname();
  const items =
    itemsProp ?? buildBreadcrumbFromPathname(pathname ?? "/dashboard");

  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={cn("min-w-0 flex-1", className)}>
      <BreadcrumbList className="flex-nowrap sm:overflow-hidden">
        {items.map((item, i) => (
          <Fragment key={`${item.label}-${item.href ?? "here"}-${i}`}>
            <BreadcrumbItem className="min-w-0 max-w-[10rem] sm:max-w-[14rem]">
              {i === items.length - 1 || !item.href ? (
                <BreadcrumbPage className="truncate" title={item.label}>
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="truncate" title={item.label}>
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {i < items.length - 1 ? (
              <BreadcrumbSeparator className="shrink-0" />
            ) : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

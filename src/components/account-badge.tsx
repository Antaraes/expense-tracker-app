import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AccountBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("max-w-[12rem] truncate font-normal", className)}>
      {name}
    </Badge>
  );
}

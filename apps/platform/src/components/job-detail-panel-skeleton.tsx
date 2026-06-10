import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailValueSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("inline-block h-3", className ?? "w-32")} />;
}

export function CodeBlockSkeleton({
  lines = 4,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 rounded-md bg-muted/50 p-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

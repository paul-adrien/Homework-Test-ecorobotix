import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn.ts";

/**
 * Minimal animated placeholder — a `div` with a soft surface-tone fill and a
 * pulse animation. Composed by feature-level skeletons (e.g. the daily and
 * hourly table skeletons) which set explicit dimensions and rounding via
 * `className`. Defaults are intentionally empty so callers don't fight the
 * primitive's geometry.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-[var(--color-border-subtle)]", className)}
      {...props}
    />
  );
}

import type { SitePublic } from "@agriwatch/shared";
import { MapPin } from "lucide-react";
import { cn } from "@/shared/lib/cn.ts";

type SiteRowProps = Readonly<{
  site: SitePublic;
  isSelected: boolean;
  onSelect: (siteId: string) => void;
}>;

/**
 * Single clickable row in the desktop sites sidebar. Extracted so the sidebar's
 * `.map` stays a one-liner and the row's visual states (selected vs. idle) live
 * in one focused place.
 */
export function SiteRow({ site, isSelected, onSelect }: SiteRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(site.id)}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
          isSelected
            ? "bg-[var(--color-primary-light)] text-[var(--color-text-primary)]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]",
        )}
      >
        <MapPin
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isSelected ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]",
          )}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate", isSelected ? "font-medium" : "font-normal")}>
            {site.label}
          </span>
          {site.displayName ? (
            <span className="truncate text-[var(--color-text-muted)] text-xs">
              {site.displayName}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

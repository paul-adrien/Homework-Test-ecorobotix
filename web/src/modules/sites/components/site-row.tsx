import type { SitePublic } from "@agriwatch/shared";
import { Heart, MapPin } from "lucide-react";
import { usePreferences } from "@/modules/preferences/hooks/use-preferences.ts";
import { useUpdatePreferencesMutation } from "@/modules/preferences/hooks/use-update-preferences-mutation.ts";
import { cn } from "@/shared/lib/cn.ts";
import { DeleteSiteButton } from "./delete-site-button.tsx";

type SiteRowProps = Readonly<{
  site: SitePublic;
  isSelected: boolean;
  onSelect: (siteId: string) => void;
  /** Called once the delete mutation succeeds — the parent removes its
   * reference (e.g. closes a drawer or updates an open menu). The cache
   * invalidation is handled inside `useDeleteSiteMutation`, so most parents
   * can leave this undefined. */
  onAfterDelete?: (siteId: string) => void;
}>;

/**
 * Single row in the sites list (used by both the desktop sidebar and the
 * mobile drawer). Three sibling controls sit on the same row:
 *  - a `select` button that fills the available width — clicking it picks
 *    the site for the dashboard.
 *  - a `heart` toggle that marks this site as the agent's default (US6).
 *    The heart fills when this site is the active default; tapping again
 *    unsets it (passes `defaultSiteId: null` to the backend).
 *  - a `delete` two-tap button (US4) — extracted into its own component
 *    because it owns its confirm-state and auto-revert timer.
 *
 * Buttons are siblings, never nested, so the HTML stays valid and each
 * action keeps its own focusable target without `e.stopPropagation` tricks.
 */
export function SiteRow({ site, isSelected, onSelect, onAfterDelete }: SiteRowProps) {
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferencesMutation();
  const isDefault = preferencesQuery.data?.defaultSiteId === site.id;

  function toggleDefault() {
    updatePreferences.mutate({ defaultSiteId: isDefault ? null : site.id });
  }

  return (
    <li
      className={cn(
        "flex items-stretch rounded-md transition-colors",
        isSelected
          ? "bg-[var(--color-primary-light)]"
          : "hover:bg-[var(--color-surface-alt)] focus-within:bg-[var(--color-surface-alt)]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(site.id)}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset",
          isSelected
            ? "text-[var(--color-text-primary)]"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
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

      <button
        type="button"
        onClick={toggleDefault}
        disabled={updatePreferences.isPending}
        aria-label={
          isDefault
            ? `Unset "${site.label}" as default site`
            : `Set "${site.label}" as default site`
        }
        aria-pressed={isDefault}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md px-2 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isDefault
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
        )}
      >
        <Heart
          className="size-4"
          fill={isDefault ? "currentColor" : "none"}
          strokeWidth={isDefault ? 0 : 2}
          aria-hidden="true"
        />
      </button>

      <DeleteSiteButton site={site} onAfterDelete={onAfterDelete} />
    </li>
  );
}

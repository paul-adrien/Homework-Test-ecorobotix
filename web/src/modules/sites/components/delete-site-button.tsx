import type { SitePublic } from "@agriwatch/shared";
import { Check, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn.ts";
import { useDeleteSiteMutation } from "../hooks/use-delete-site-mutation.ts";

type DeleteSiteButtonProps = Readonly<{
  site: SitePublic;
  /** Optional notification when the delete succeeds. Used by callers
   * embedded in a closeable surface (e.g. a drawer) to clean up. */
  onAfterDelete?: (siteId: string) => void;
}>;

/**
 * Two-tap destructive button (US4, per CLAUDE.md option B):
 *  - 1st click arms the button — it widens to "Confirm" with a red fill.
 *  - 2nd click on the same button fires the delete.
 *  - A click anywhere else on the page cancels — no auto-revert timer, no
 *    extra cancel control to discover. Same pattern as a dropdown or a
 *    popover, so the gesture is already familiar to the agent.
 *
 * The confirm state lives here (not in the parent SiteRow) so the row stays
 * presentational and a misclick on one site doesn't bleed into another
 * row's state. We picked two-tap over a `<Dialog>` confirm (also valid per
 * the brief) because it keeps the action one tap away on mobile — no modal,
 * no focus trap, no overlay tap-to-dismiss.
 */
export function DeleteSiteButton({ site, onAfterDelete }: DeleteSiteButtonProps) {
  const [armed, setArmed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const deleteMutation = useDeleteSiteMutation();

  // Outside-click cancel — `pointerdown` (not `click`) so the cancel fires
  // before the focused element loses focus, which matters when the next
  // interaction is on another button (it would otherwise eat the first
  // click). The capture phase guarantees we run before any inner handler.
  useEffect(() => {
    if (!armed) return;
    function handlePointerDown(event: PointerEvent) {
      if (buttonRef.current?.contains(event.target as Node)) return;
      setArmed(false);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [armed]);

  function handleClick() {
    if (deleteMutation.isPending) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    deleteMutation.mutate(site.id, {
      onSuccess: () => {
        setArmed(false);
        onAfterDelete?.(site.id);
      },
      onError: () => setArmed(false),
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={deleteMutation.isPending}
      aria-label={armed ? `Confirm delete "${site.label}"` : `Delete "${site.label}"`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md px-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] focus-visible:ring-inset",
        "disabled:cursor-not-allowed disabled:opacity-50",
        armed
          ? "bg-[var(--color-danger)] text-white"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-danger)]",
      )}
    >
      {armed ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Trash2 className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

import type { SitePublic } from "@agriwatch/shared";
import { CalendarClock } from "lucide-react";

type ForecastPlaceholderProps = Readonly<{
  site: SitePublic;
}>;

/**
 * Stand-in shown in the forecast slot of the dashboard until Phase 3 (weather
 * provider) and Phase 4 (real forecast UI) land. Surfaces the currently
 * selected site so the agent can verify the wiring works end to end.
 */
export function ForecastPlaceholder({ site }: ForecastPlaceholderProps) {
  return (
    <section className="flex w-full flex-1 flex-col gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
      <header className="flex items-center gap-2">
        <CalendarClock className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
        <div className="flex flex-col">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{site.label}</h3>
          {site.displayName ? (
            <p className="text-[var(--color-text-secondary)] text-xs">{site.displayName}</p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-[var(--color-border-subtle)] border-dashed bg-[var(--color-surface-alt)] p-6 text-center">
        <p className="font-medium text-[var(--color-text-primary)] text-sm">Forecast coming soon</p>
        <p className="max-w-md text-[var(--color-text-secondary)] text-xs">
          The daily and hourly forecast table for this site lands in Phase 4. Until then this slot
          just confirms the site selection flow is wired up.
        </p>
        <p className="mt-2 font-mono text-[var(--color-text-muted)] text-xs">
          {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
        </p>
      </div>
    </section>
  );
}

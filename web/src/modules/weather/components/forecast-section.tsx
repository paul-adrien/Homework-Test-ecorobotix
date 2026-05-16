import type { SitePublic } from "@agriwatch/shared";
import { AlertCircle } from "lucide-react";
import { useCurrentAndDaily } from "../hooks/use-current-and-daily.ts";
import { DailySummaryTable } from "./daily-summary-table.tsx";

const DEFAULT_DAYS = 7;

type ForecastSectionProps = Readonly<{
  site: SitePublic;
}>;

/**
 * Forecast block for a selected site. Owns the data fetch and decides what
 * to show (loading skeleton, error notice, empty result, or the actual
 * daily summary table). The hourly drill-down table lands in Phase 4.C and
 * will be rendered below the daily summary on day selection.
 */
export function ForecastSection({ site }: ForecastSectionProps) {
  const query = useCurrentAndDaily({ site, days: DEFAULT_DAYS });

  return (
    <section
      aria-label={`Forecast for ${site.label}`}
      className="flex w-full flex-1 flex-col gap-3"
    >
      {query.isPending ? (
        <p className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-6 text-center text-[var(--color-text-secondary)] text-sm">
          Loading forecast…
        </p>
      ) : null}

      {query.isError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-3 text-[var(--color-danger)] text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Couldn't load the forecast. The provider may be temporarily unavailable — try again or
            switch source.
          </p>
        </div>
      ) : null}

      {query.data ? <DailySummaryTable daily={query.data.daily} /> : null}
    </section>
  );
}

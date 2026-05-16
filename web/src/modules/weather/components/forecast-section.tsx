import type { SitePublic } from "@agriwatch/shared";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentAndDaily } from "../hooks/use-current-and-daily.ts";
import { useHourly } from "../hooks/use-hourly.ts";
import { useProviders } from "../hooks/use-providers.ts";
import type { SliceHours } from "../lib/slice-hourly.ts";
import { DailySummaryTable } from "./daily/daily-summary-table.tsx";
import { HourlyHeader } from "./hourly/hourly-header.tsx";
import { HourlyTable } from "./hourly/hourly-table.tsx";
import { ProviderModelSwitcher, type ProviderSelection } from "./provider-model-switcher.tsx";

const DEFAULT_DAYS = 7;

type ForecastSectionProps = Readonly<{
  site: SitePublic;
}>;

/**
 * Forecast block for a selected site. Owns the data fetch for both the
 * daily summary (current + multi-day bundle) and the hourly drill-down
 * for the currently picked day, plus the active weather source selection
 * (provider + optional model). The selected day defaults to the first
 * available day (typically today) so the agent sees an hourly breakdown
 * on first load without needing an extra tap; switching day is a
 * one-click action on the daily table row. The selected source persists
 * across site switches because this component is re-used (no `key` prop on
 * the parent), which matches the agent's expectation that picking "ECMWF"
 * once applies to whatever site they look at next.
 */
export function ForecastSection({ site }: ForecastSectionProps) {
  const [selection, setSelection] = useState<ProviderSelection | null>(null);
  const providersQuery = useProviders();
  const bundleQuery = useCurrentAndDaily({
    site,
    days: DEFAULT_DAYS,
    providerId: selection?.providerId,
    model: selection?.model,
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sliceHours, setSliceHours] = useState<SliceHours>(3);

  // Auto-pin the first available (provider, model) entry once the providers
  // list resolves. The backend would have served the same data via its own
  // fallback to the user's preferred provider, but mirroring the choice in
  // the trigger ensures the agent can always read what's currently displayed
  // — no silent "default in use, switcher empty" mismatch.
  useEffect(() => {
    if (selection !== null) return;
    const providers = providersQuery.data;
    if (providers === undefined || providers.length === 0) return;
    const first = providers[0];
    if (first === undefined) return;
    const firstModel = first.models?.[0];
    setSelection({ providerId: first.id, model: firstModel?.id });
  }, [providersQuery.data, selection]);

  // Auto-pin the first available day when the bundle loads, OR when the
  // currently-selected date disappears from the new bundle (provider/site
  // switch). Keeps the hourly table always populated without forcing
  // the agent to re-click after a refresh.
  useEffect(() => {
    const dates = bundleQuery.data?.daily.map((d) => d.date) ?? [];
    if (dates.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }
    if (selectedDate === null || !dates.includes(selectedDate)) {
      setSelectedDate(dates[0] ?? null);
    }
  }, [bundleQuery.data, selectedDate]);

  const hourlyQuery = useHourly({
    site,
    date: selectedDate,
    providerId: selection?.providerId,
    model: selection?.model,
  });

  return (
    <section
      aria-label={`Forecast for ${site.label}`}
      className="flex w-full flex-1 flex-col gap-3"
    >
      <ProviderModelSwitcher selection={selection} onChange={setSelection} />

      {bundleQuery.isPending ? (
        <p className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-6 text-center text-[var(--color-text-secondary)] text-sm">
          Loading forecast…
        </p>
      ) : null}

      {bundleQuery.isError ? (
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

      {bundleQuery.data ? (
        <DailySummaryTable
          daily={bundleQuery.data.daily}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      {hourlyQuery.isError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-3 text-[var(--color-danger)] text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Couldn't load the hourly breakdown for this day.</p>
        </div>
      ) : null}

      {bundleQuery.data && selectedDate !== null ? (
        <div className="mt-3">
          <HourlyHeader
            selectedDate={selectedDate}
            availableDates={bundleQuery.data.daily.map((d) => d.date)}
            onSelectDate={setSelectedDate}
            sliceHours={sliceHours}
            onChangeSliceHours={setSliceHours}
          />
        </div>
      ) : null}

      {hourlyQuery.data && selectedDate !== null ? (
        <HourlyTable
          hourly={hourlyQuery.data}
          sliceHours={sliceHours}
          selectedDate={selectedDate}
        />
      ) : null}
    </section>
  );
}

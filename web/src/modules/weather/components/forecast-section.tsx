import type { SitePublic } from "@agriwatch/shared";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { TemperatureUnitToggle } from "@/modules/preferences/components/temperature-unit-toggle.tsx";
import { useCurrentAndDaily } from "../hooks/use-current-and-daily.ts";
import { useHourly } from "../hooks/use-hourly.ts";
import { useProviders } from "../hooks/use-providers.ts";
import type { SliceHours } from "../lib/slice-hourly.ts";
import { DailySummaryTable } from "./daily/daily-summary-table.tsx";
import { DailySummaryTableSkeleton } from "./daily/daily-summary-table-skeleton.tsx";
import { HourlyHeader } from "./hourly/hourly-header.tsx";
import { HourlyTable } from "./hourly/hourly-table.tsx";
import { HourlyTableSkeleton } from "./hourly/hourly-table-skeleton.tsx";
import { ProviderModelSwitcher, type ProviderSelection } from "./provider-model-switcher.tsx";

const DEFAULT_DAYS = 7;

type ForecastSectionProps = Readonly<{
  site: SitePublic;
  /** Notified whenever the user picks a different day in the daily table.
   * The dashboard uses it to decide whether to enable the radar overlay
   * (which only makes sense when the agent is looking at today). */
  onSelectedDateChange?: (date: string | null) => void;
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
export function ForecastSection({ site, onSelectedDateChange }: ForecastSectionProps) {
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
  // fallback, but mirroring the choice in the trigger ensures the agent can
  // always read what's currently displayed — no silent "default in use,
  // switcher empty" mismatch.
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

  // Bubble the current selection up so the dashboard can drive the map
  // (e.g. disable the radar overlay when the agent isn't looking at today).
  useEffect(() => {
    onSelectedDateChange?.(selectedDate);
  }, [selectedDate, onSelectedDateChange]);

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
      <div className="flex flex-row items-end gap-3">
        <div className="min-w-0 flex-1">
          <ProviderModelSwitcher selection={selection} onChange={setSelection} />
        </div>
        <TemperatureUnitToggle />
      </div>

      {/* Freshness caption — surfaces the upstream observation time
          (provider's snapshot stamp, not our cache age) so the agent
          can tell at a glance whether the displayed numbers are minutes
          or hours old. Only rendered once the bundle resolves. */}
      {bundleQuery.data ? (
        <p className="text-[var(--color-text-muted)] text-xs">
          Data from {formatObservationTime(bundleQuery.data.current.observedAt)}
        </p>
      ) : null}

      {bundleQuery.isPending ? <DailySummaryTableSkeleton days={DEFAULT_DAYS} /> : null}

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

      {hourlyQuery.isPending && selectedDate !== null ? (
        <HourlyTableSkeleton sliceHours={sliceHours} />
      ) : null}
    </section>
  );
}

/**
 * Formats an ISO datetime (the provider's `observedAt` stamp) as a local
 * `HH:mm`. The provider's snapshot already accounts for the upstream
 * model's update cadence, so the displayed time tells the agent how
 * stale the data is independent of our backend cache layer.
 */
function formatObservationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

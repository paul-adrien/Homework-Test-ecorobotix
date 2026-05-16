/**
 * biome-ignore-all lint/a11y/useSemanticElements: same segmented-control
 * pattern as `GranularityOption` — `role="radio"` on `<button>` with
 * aria-checked is the canonical ARIA recipe; native `<input type="radio">`
 * would mean extra wrapping markup for no real a11y win.
 */
import type { TemperatureUnit } from "@agriwatch/shared";
import { cn } from "@/shared/lib/cn.ts";
import { usePreferences } from "../hooks/use-preferences.ts";
import { useUpdatePreferencesMutation } from "../hooks/use-update-preferences-mutation.ts";

const OPTIONS: ReadonlyArray<{ value: TemperatureUnit; label: string }> = [
  { value: "celsius", label: "°C" },
  { value: "fahrenheit", label: "°F" },
];

/**
 * Segmented control that toggles the user's persisted temperature unit
 * (US5). Lives next to the provider switcher above the daily table — same
 * row, same height — because it's another "what do I want the forecast
 * to look like" knob and the agent shouldn't hunt for it in a separate
 * menu. The mutation is optimistic, so flipping the unit re-renders every
 * temperature on screen on the next paint.
 *
 * Renders nothing while preferences haven't loaded yet — the placeholder
 * width matches the loaded control (rough `min-w-[5rem]`) so the row
 * doesn't jump when the data lands.
 */
export function TemperatureUnitToggle() {
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferencesMutation();
  const current = preferencesQuery.data?.temperatureUnit;

  function setUnit(unit: TemperatureUnit) {
    if (current === unit) return;
    updatePreferences.mutate({ temperatureUnit: unit });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Temperature unit"
      className="inline-flex h-10 shrink-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-1"
    >
      {OPTIONS.map((option) => {
        const isActive = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={!current || updatePreferences.isPending}
            onClick={() => setUnit(option.value)}
            className={cn(
              "min-w-[2.25rem] rounded px-2 font-medium text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "bg-[var(--color-primary-light)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

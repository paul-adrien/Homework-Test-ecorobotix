import type { WeatherProviderId, WeatherProviderInfo } from "@agriwatch/shared";
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select.tsx";
import { useProviders } from "../hooks/use-providers.ts";

export type ProviderSelection = Readonly<{
  providerId: WeatherProviderId;
  /** Undefined for providers that don't expose a model (e.g. Yr.no). */
  model: string | undefined;
}>;

type ProviderModelSwitcherProps = Readonly<{
  selection: ProviderSelection | null;
  onChange: (next: ProviderSelection) => void;
}>;

/**
 * Encodes a (provider, model) tuple into a single string so it can ride on a
 * Radix Select's `value` prop. `"<providerId>"` when the provider has no
 * models, `"<providerId>:<modelId>"` otherwise — chosen over JSON because the
 * value flows through `aria-activedescendant` / DOM attributes and a plain
 * string keeps DevTools readable.
 */
function encodeSelection(selection: ProviderSelection): string {
  return selection.model === undefined
    ? selection.providerId
    : `${selection.providerId}:${selection.model}`;
}

function decodeSelection(value: string): ProviderSelection {
  const sepIndex = value.indexOf(":");
  if (sepIndex === -1) return { providerId: value as WeatherProviderId, model: undefined };
  return {
    providerId: value.slice(0, sepIndex) as WeatherProviderId,
    model: value.slice(sepIndex + 1),
  };
}

/**
 * Builds the human-readable label shown in the trigger when a selection is
 * active. Mirrors the dropdown entry so the agent recognises what's currently
 * loaded at a glance ("Open-Meteo · ECMWF" vs just "Open-Meteo").
 */
function selectionLabel(
  providers: ReadonlyArray<WeatherProviderInfo>,
  selection: ProviderSelection,
): string | null {
  const provider = providers.find((p) => p.id === selection.providerId);
  if (provider === undefined) return null;
  if (selection.model === undefined) return provider.displayName;
  const model = provider.models?.find((m) => m.id === selection.model);
  if (model === undefined) return provider.displayName;
  return `${provider.displayName} · ${model.displayName}`;
}

/**
 * Dropdown that flattens the (provider, model) tree returned by
 * `/api/weather/providers` into a single selectable list, grouped per provider
 * so the agent reads the source at a glance:
 *
 *     Open-Meteo
 *       Best match
 *       ECMWF
 *       ICON
 *       GFS
 *     ─────────
 *     Yr.no
 *
 * Selecting any entry lifts a `{ providerId, model }` tuple to the parent
 * (typically `ForecastSection`) which threads it into the bundle + hourly
 * query keys — switching providers/models invalidates the cache cleanly and
 * triggers a fresh fetch without any manual coordination.
 *
 * The component is intentionally controlled (no internal state) so the parent
 * decides what's selected after a site change or a preference load.
 */
export function ProviderModelSwitcher({ selection, onChange }: ProviderModelSwitcherProps) {
  const providersQuery = useProviders();
  const providers = providersQuery.data;

  // Encoded current value, or undefined if no selection is active yet (the
  // dropdown renders its placeholder).
  const currentValue = selection === null ? undefined : encodeSelection(selection);
  const currentLabel = useMemo(
    () => (providers && selection ? selectionLabel(providers, selection) : null),
    [providers, selection],
  );

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label
        htmlFor="provider-switcher"
        className="font-medium text-[var(--color-text-secondary)] text-xs uppercase tracking-wide"
      >
        Source
      </label>
      <div className="sm:min-w-[16rem] sm:flex-1 sm:max-w-sm">
        <Select
          value={currentValue}
          onValueChange={(value) => onChange(decodeSelection(value))}
          disabled={providersQuery.isPending || providers === undefined}
        >
          <SelectTrigger id="provider-switcher" aria-label="Weather data source">
            <SelectValue
              placeholder={providersQuery.isPending ? "Loading sources…" : "Select source"}
            >
              {currentLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {providers?.map((provider, index) => {
              const hasModels = provider.models !== undefined && provider.models.length > 0;
              const needsSeparator = index > 0;
              return hasModels ? (
                <SelectGroup key={provider.id}>
                  {needsSeparator ? (
                    <div className="-mx-1 my-1 h-px bg-[var(--color-border-subtle)]" />
                  ) : null}
                  <SelectLabel>{provider.displayName}</SelectLabel>
                  {provider.models?.map((model) => (
                    <SelectItem
                      key={`${provider.id}:${model.id}`}
                      value={`${provider.id}:${model.id}`}
                    >
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                <SelectGroup key={provider.id}>
                  {needsSeparator ? (
                    <div className="-mx-1 my-1 h-px bg-[var(--color-border-subtle)]" />
                  ) : null}
                  <SelectItem value={provider.id}>{provider.displayName}</SelectItem>
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

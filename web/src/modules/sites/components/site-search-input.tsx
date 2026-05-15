import type { GeocodingResult } from "@agriwatch/shared";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { useGeocodingSearch } from "@/modules/geocoding/hooks/use-geocoding-search.ts";
import { Input } from "@/shared/ui/input.tsx";

type SiteSearchInputProps = Readonly<{
  onSelect: (result: GeocodingResult) => void;
  autoFocus?: boolean;
}>;

/**
 * Search bar with live autocomplete that calls our /api/geocoding/search
 * endpoint. The hook debounces the query and caches results in TanStack
 * Query — typing fast doesn't spam the API.
 */
export function SiteSearchInput({ onSelect, autoFocus }: SiteSearchInputProps) {
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching, isError } = useGeocodingSearch(query);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="site-search-query"
          className="font-medium text-[var(--color-text-primary)] text-sm"
        >
          Search for a location
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            id="site-search-query"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Yverdon, Lausanne, …"
            className="pl-9"
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {query.trim().length >= 2 ? (
        <ul className="max-h-64 overflow-y-auto rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-sm">
          {isFetching && results.length === 0 ? (
            <li className="px-3 py-2 text-[var(--color-text-secondary)] text-sm">Searching…</li>
          ) : null}
          {isError ? (
            <li className="px-3 py-2 text-[var(--color-danger)] text-sm">
              Couldn't reach the geocoding service. Try again in a moment.
            </li>
          ) : null}
          {!isFetching && !isError && results.length === 0 ? (
            <li className="px-3 py-2 text-[var(--color-text-secondary)] text-sm">
              No matching locations.
            </li>
          ) : null}
          {results.map((result) => (
            <li key={`${result.latitude}-${result.longitude}-${result.displayName}`}>
              <button
                type="button"
                onClick={() => onSelect(result)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)] focus-visible:outline-none"
              >
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {result.name}
                  </span>
                  <span className="text-[var(--color-text-secondary)] text-xs">
                    {result.displayName}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

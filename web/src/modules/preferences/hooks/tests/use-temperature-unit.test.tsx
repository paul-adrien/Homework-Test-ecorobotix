import type { UserPreferences } from "@agriwatch/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { preferencesQueryKey } from "../use-preferences.ts";
import { useTemperatureUnit } from "../use-temperature-unit.ts";

function buildWrapper(preferences: UserPreferences | undefined) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  if (preferences) {
    queryClient.setQueryData(preferencesQueryKey, preferences);
  }
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useTemperatureUnit", () => {
  it("falls back to celsius before preferences load (matches the Prisma default)", () => {
    const { result } = renderHook(() => useTemperatureUnit(), { wrapper: buildWrapper(undefined) });
    expect(result.current.unit).toBe("celsius");
    expect(result.current.symbol).toBe("°C");
    expect(result.current.formatTemp(20)).toBe("20");
  });

  it("returns the persisted unit + matching symbol when fahrenheit is selected", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "fahrenheit", defaultSiteId: null }),
    });
    expect(result.current.unit).toBe("fahrenheit");
    expect(result.current.symbol).toBe("°F");
  });

  it("converts celsius values to fahrenheit at display time", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "fahrenheit", defaultSiteId: null }),
    });
    // 0°C → 32°F, 100°C → 212°F, 20°C → 68°F (the spec checks).
    expect(result.current.formatTemp(0)).toBe("32");
    expect(result.current.formatTemp(100)).toBe("212");
    expect(result.current.formatTemp(20)).toBe("68");
  });

  it("passes celsius values through unchanged when the unit is celsius", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "celsius", defaultSiteId: null }),
    });
    expect(result.current.formatTemp(0)).toBe("0");
    expect(result.current.formatTemp(20.7, 1)).toBe("20.7");
  });

  it("emits the em-dash placeholder on a null input regardless of unit", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "fahrenheit", defaultSiteId: null }),
    });
    expect(result.current.formatTemp(null)).toBe("—");
    expect(result.current.formatTempRange(null, null)).toBe("—");
  });

  it("formats a min/max range with the slash separator (no spaces, no unit)", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "celsius", defaultSiteId: null }),
    });
    expect(result.current.formatTempRange(12, 22)).toBe("12/22");
  });

  it("converts both ends of the range when the unit is fahrenheit", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "fahrenheit", defaultSiteId: null }),
    });
    // 12°C → 53.6°F → "54", 22°C → 71.6°F → "72" (rounded to no decimals).
    expect(result.current.formatTempRange(12, 22)).toBe("54/72");
  });

  it("uses em-dash for missing ends of a partial range", () => {
    const { result } = renderHook(() => useTemperatureUnit(), {
      wrapper: buildWrapper({ temperatureUnit: "celsius", defaultSiteId: null }),
    });
    expect(result.current.formatTempRange(null, 22)).toBe("—/22");
    expect(result.current.formatTempRange(12, null)).toBe("12/—");
  });
});

import { describe, expect, it } from "vitest";
import { getHumidityTier, getPrecipTier, getTempTier, getWindTier } from "../metric-thresholds.ts";

describe("getTempTier", () => {
  it("returns null when both min and max are missing", () => {
    expect(getTempTier(null, null)).toBeNull();
  });

  it("forces tier 1 when min is below freezing, regardless of max", () => {
    // Frost overnight even if the afternoon is warm — the frost is the
    // signal the agent acts on, not the daily average.
    expect(getTempTier(-2, 25)).toBe(1);
    expect(getTempTier(-0.1, 30)).toBe(1);
  });

  it("forces tier 4 when max hits heat stress (>=32°C)", () => {
    expect(getTempTier(15, 32)).toBe(4);
    expect(getTempTier(15, 40)).toBe(4);
  });

  it("maps the warm band (25..31°C) to tier 3", () => {
    expect(getTempTier(10, 25)).toBe(3);
    expect(getTempTier(10, 31.9)).toBe(3);
  });

  it("maps the mild band (15..24°C) to tier 2", () => {
    expect(getTempTier(5, 15)).toBe(2);
    expect(getTempTier(5, 24)).toBe(2);
  });

  it("falls through to tier 1 for cool days (max < 15°C, no frost)", () => {
    expect(getTempTier(2, 10)).toBe(1);
    expect(getTempTier(0, 14.9)).toBe(1);
  });
});

describe("getPrecipTier", () => {
  it("returns null when amount is missing", () => {
    expect(getPrecipTier(null)).toBeNull();
  });

  it("maps to tier 4 at or above 20 mm (field work blocked)", () => {
    expect(getPrecipTier(20)).toBe(4);
    expect(getPrecipTier(50)).toBe(4);
  });

  it("maps to tier 3 in the wet band (10..19 mm)", () => {
    expect(getPrecipTier(10)).toBe(3);
    expect(getPrecipTier(19.9)).toBe(3);
  });

  it("maps to tier 2 in the light band (1..9 mm)", () => {
    expect(getPrecipTier(1)).toBe(2);
    expect(getPrecipTier(9.9)).toBe(2);
  });

  it("maps to tier 1 for trace or dry conditions (< 1 mm)", () => {
    expect(getPrecipTier(0)).toBe(1);
    expect(getPrecipTier(0.5)).toBe(1);
  });
});

describe("getWindTier", () => {
  it("returns null when speed is missing", () => {
    expect(getWindTier(null)).toBeNull();
  });

  it("maps to tier 4 at or above 40 km/h (equipment hazard)", () => {
    expect(getWindTier(40)).toBe(4);
    expect(getWindTier(60)).toBe(4);
  });

  it("maps to tier 3 at the spray limit band (25..39 km/h)", () => {
    expect(getWindTier(25)).toBe(3);
    expect(getWindTier(39)).toBe(3);
  });

  it("maps to tier 2 in the breezy band (15..24 km/h)", () => {
    expect(getWindTier(15)).toBe(2);
    expect(getWindTier(24)).toBe(2);
  });

  it("maps to tier 1 in the calm band (< 15 km/h)", () => {
    expect(getWindTier(0)).toBe(1);
    expect(getWindTier(14.9)).toBe(1);
  });
});

describe("getHumidityTier", () => {
  it("returns null when humidity is missing (e.g. Yr.no daily mean)", () => {
    expect(getHumidityTier(null)).toBeNull();
  });

  it("maps to tier 4 at or above 90% (saturated / fog risk)", () => {
    expect(getHumidityTier(90)).toBe(4);
    expect(getHumidityTier(100)).toBe(4);
  });

  it("maps to tier 3 in the mildew-friendly band (75..89%)", () => {
    expect(getHumidityTier(75)).toBe(3);
    expect(getHumidityTier(89)).toBe(3);
  });

  it("maps to tier 2 in the comfortable band (40..74%)", () => {
    expect(getHumidityTier(40)).toBe(2);
    expect(getHumidityTier(74)).toBe(2);
  });

  it("maps to tier 1 in the dry band (< 40%)", () => {
    expect(getHumidityTier(20)).toBe(1);
    expect(getHumidityTier(39)).toBe(1);
  });
});

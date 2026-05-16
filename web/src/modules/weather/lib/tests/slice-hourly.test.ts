import type { HourlyForecast } from "@agriwatch/shared";
import { describe, expect, it } from "vitest";
import { aggregateToSlices } from "../slice-hourly.ts";

function entry(hour: number, over: Partial<HourlyForecast> = {}): HourlyForecast {
  const iso = `2026-05-15T${String(hour).padStart(2, "0")}:00:00.000Z`;
  return {
    time: iso,
    temperature: 10,
    precipitation: 0,
    precipitationProbability: 0,
    windSpeed: 5,
    windDirection: 90,
    humidity: 50,
    weatherCode: 0,
    ...over,
  };
}

describe("aggregateToSlices", () => {
  it("emits 8 slices at 3 h granularity", () => {
    const hourly = Array.from({ length: 24 }, (_, h) => entry(h));
    const slices = aggregateToSlices(hourly, 3);
    expect(slices).toHaveLength(8);
    expect(slices.map((s) => s.startHour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    expect(slices.map((s) => s.label)).toEqual([
      "00 h",
      "03 h",
      "06 h",
      "09 h",
      "12 h",
      "15 h",
      "18 h",
      "21 h",
    ]);
  });

  it("emits 24 slices at 1 h granularity", () => {
    const hourly = Array.from({ length: 24 }, (_, h) => entry(h));
    const slices = aggregateToSlices(hourly, 1);
    expect(slices).toHaveLength(24);
    expect(slices[0]?.label).toBe("00 h");
    expect(slices[23]?.label).toBe("23 h");
  });

  it("averages temperature and humidity over the slice", () => {
    const hourly = [
      entry(12, { temperature: 10, humidity: 50 }),
      entry(13, { temperature: 20, humidity: 60 }),
      entry(14, { temperature: 30, humidity: 70 }),
    ];
    const slice = aggregateToSlices(hourly, 3).find((s) => s.startHour === 12);
    expect(slice?.temperatureMean).toBe(20);
    expect(slice?.humidityMean).toBe(60);
  });

  it("sums precipitation over the slice (cumulative rain matters)", () => {
    const hourly = [
      entry(9, { precipitation: 0.5 }),
      entry(10, { precipitation: 1.5 }),
      entry(11, { precipitation: 2 }),
    ];
    const slice = aggregateToSlices(hourly, 3).find((s) => s.startHour === 9);
    expect(slice?.precipitationSum).toBe(4);
  });

  it("takes the max of precipitation probability and wind speed", () => {
    const hourly = [
      entry(15, { precipitationProbability: 10, windSpeed: 5 }),
      entry(16, { precipitationProbability: 80, windSpeed: 30 }),
      entry(17, { precipitationProbability: 30, windSpeed: 12 }),
    ];
    const slice = aggregateToSlices(hourly, 3).find((s) => s.startHour === 15);
    expect(slice?.precipitationProbabilityMax).toBe(80);
    expect(slice?.windSpeedMax).toBe(30);
  });

  it("ignores null metric values when aggregating (Yr.no sparse data)", () => {
    const hourly = [
      entry(0, { temperature: 10, precipitation: null }),
      entry(1, { temperature: null, precipitation: 2 }),
      entry(2, { temperature: 14, precipitation: null }),
    ];
    const slice = aggregateToSlices(hourly, 3).find((s) => s.startHour === 0);
    expect(slice?.temperatureMean).toBe(12); // (10 + 14) / 2
    expect(slice?.precipitationSum).toBe(2); // single non-null entry
  });

  it("emits null metrics on slices with no hourly data instead of skipping the row", () => {
    // Yr.no's long-range entries thin out past day 2, so some slices land
    // empty — the table should still show the row so the grid stays stable.
    const hourly = [entry(6), entry(7), entry(8)];
    const slices = aggregateToSlices(hourly, 3);
    const morning = slices.find((s) => s.startHour === 6);
    const evening = slices.find((s) => s.startHour === 21);
    expect(morning?.temperatureMean).not.toBeNull();
    expect(evening?.temperatureMean).toBeNull();
    expect(evening?.precipitationSum).toBeNull();
    expect(evening?.windSpeedMax).toBeNull();
  });

  it("picks the wind direction from the entry closest to the slice midpoint", () => {
    // 3-hour slice [12-15) midpoint is 13.5 → the entry at hour 13 wins
    // over hours 12 or 14.
    const hourly = [
      entry(12, { windDirection: 90 }),
      entry(13, { windDirection: 180 }),
      entry(14, { windDirection: 270 }),
    ];
    const slice = aggregateToSlices(hourly, 3).find((s) => s.startHour === 12);
    expect(slice?.windDirectionMid).toBe(180);
  });

  it("skips entries with null wind direction when picking the mid-slice direction", () => {
    const hourly = [
      entry(12, { windDirection: 90 }),
      entry(13, { windDirection: null }),
      entry(14, { windDirection: 270 }),
    ];
    const slice = aggregateToSlices(hourly, 3).find((s) => s.startHour === 12);
    // Midpoint of [12-15) is 13.5: hour 14 (distance 0.5) is closer than
    // hour 12 (distance 1.5), so 270° wins after the null at 13 is skipped.
    expect(slice?.windDirectionMid).toBe(270);
  });

  it("with fromHour, drops slices whose end has elapsed (today filter)", () => {
    const hourly = Array.from({ length: 24 }, (_, h) => entry(h));
    // At 14:30 the [12-15) slice still contains "now" → keep it; earlier
    // slices have fully passed → drop them.
    const slices = aggregateToSlices(hourly, 3, { fromHour: 14 });
    expect(slices.map((s) => s.startHour)).toEqual([12, 15, 18, 21]);
  });

  it("with fromHour at the boundary, drops the slice that has just ended", () => {
    const hourly = Array.from({ length: 24 }, (_, h) => entry(h));
    // At exactly 15:00 the [12-15) slice has just ended (endHour=15 not >
    // fromHour=15) → drop it; [15-18) is the current one → keep it.
    const slices = aggregateToSlices(hourly, 3, { fromHour: 15 });
    expect(slices.map((s) => s.startHour)).toEqual([15, 18, 21]);
  });

  it("without fromHour, never drops anything (future day case)", () => {
    const hourly = Array.from({ length: 24 }, (_, h) => entry(h));
    const slices = aggregateToSlices(hourly, 3);
    expect(slices).toHaveLength(8);
  });
});

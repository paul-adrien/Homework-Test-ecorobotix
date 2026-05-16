import type { DailyForecast } from "@agriwatch/shared";
import {
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Droplet,
  type LucideIcon,
  Snowflake,
  Sun,
  ThermometerSun,
  Umbrella,
  Wind,
} from "lucide-react";
import { cn } from "@/shared/lib/cn.ts";
import { formatDayLabel, formatNumber, formatTempRange } from "../lib/format.ts";
import {
  CHIP_CLASS,
  CHIP_NEUTRAL,
  type DayWeatherIcon,
  getDayWeatherIcon,
  getHumidityTier,
  getPrecipTier,
  getTempTier,
  getWindTier,
  type Metric,
  type Tier,
} from "../lib/metric-thresholds.ts";

const DAY_ICON: Record<DayWeatherIcon, { Icon: LucideIcon; color: string }> = {
  snowflake: { Icon: Snowflake, color: "text-sky-500" },
  "cloud-rain": { Icon: CloudRain, color: "text-blue-500" },
  "cloud-drizzle": { Icon: CloudDrizzle, color: "text-sky-500" },
  sun: { Icon: Sun, color: "text-amber-500" },
  cloud: { Icon: Cloud, color: "text-slate-500" },
};

type DailySummaryTableProps = Readonly<{
  daily: ReadonlyArray<DailyForecast>;
}>;

/**
 * Multi-day weather summary. One row per upcoming day; one chip per
 * decision-driving metric (temp / precip / wind / humidity). Each chip's
 * background is graduated from "calm" to "extreme" via `CHIP_CLASS` so the
 * agent reads risk by hue, not by parsing every number. The first column
 * carries a weather hint icon — sun / cloud / rain / snowflake — picked
 * from the day's dominant condition.
 *
 * Units live in the column headers (no unit suffix in the cells) so the
 * tabular numbers align cleanly and the chips stay compact enough for the
 * table to fit without horizontal scroll.
 */
export function DailySummaryTable({ daily }: DailySummaryTableProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead className="border-[var(--color-border-subtle)] border-b bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] text-xs">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-left font-medium">
              Day
            </th>
            <ColumnHeader icon={ThermometerSun} label="Temp" unit="°C" />
            <ColumnHeader icon={Umbrella} label="Precip" unit="mm" />
            <ColumnHeader icon={Wind} label="Wind" unit="km/h" />
            <ColumnHeader icon={Droplet} label="Humidity" unit="%" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {daily.map((day) => (
            <DailyRow key={day.date} day={day} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnHeader({
  icon: Icon,
  label,
  unit,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  unit: string;
}>) {
  return (
    <th scope="col" className="px-2 py-2.5 text-center font-medium">
      <span className="inline-flex items-center gap-1.5">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">
          {label}
          <span className="ml-1 font-normal text-[10px] text-[var(--color-text-muted)]">
            ({unit})
          </span>
        </span>
      </span>
    </th>
  );
}

function DailyRow({ day }: { day: DailyForecast }) {
  const dayIconKey = getDayWeatherIcon(day);
  const { Icon, color: iconColor } = DAY_ICON[dayIconKey];
  const tempTier = getTempTier(day.temperatureMin, day.temperatureMax);
  const precipTier = getPrecipTier(day.precipitationSum);
  const windTier = getWindTier(day.windSpeedMax);
  const humidityTier = getHumidityTier(day.humidityMean);

  return (
    <tr>
      <th scope="row" className="whitespace-nowrap px-3 py-2.5 text-left">
        <span className="inline-flex items-center gap-2">
          <span className="font-medium text-[var(--color-text-primary)]">
            {formatDayLabel(day.date)}
          </span>
          <Icon className={cn("size-5 shrink-0", iconColor)} aria-hidden="true" />
        </span>
      </th>
      <ChipTd metric="temp" tier={tempTier}>
        {formatTempRange(day.temperatureMin, day.temperatureMax)}
      </ChipTd>
      <ChipTd metric="precip" tier={precipTier}>
        {formatNumber(day.precipitationSum, 1)}
      </ChipTd>
      <ChipTd metric="wind" tier={windTier}>
        <span className="inline-flex items-center gap-1">
          {formatNumber(day.windSpeedMax)}
          {day.windDirectionDominant !== null ? (
            <WindArrow direction={day.windDirectionDominant} />
          ) : null}
        </span>
      </ChipTd>
      <ChipTd metric="humidity" tier={humidityTier}>
        {formatNumber(day.humidityMean)}
      </ChipTd>
    </tr>
  );
}

function ChipTd({
  metric,
  tier,
  children,
}: {
  metric: Metric;
  tier: Tier | null;
  children: React.ReactNode;
}) {
  const chipClass = tier === null ? CHIP_NEUTRAL : CHIP_CLASS[metric][tier];
  return (
    <td className="px-2 py-2 text-center">
      <span
        className={cn(
          "inline-flex min-w-[3rem] items-center justify-center whitespace-nowrap rounded-md px-2 py-1 font-mono text-sm tabular-nums",
          chipClass,
        )}
      >
        {children}
      </span>
    </td>
  );
}

function WindArrow({ direction }: { direction: number }) {
  // Met providers report wind direction as the angle the wind is COMING FROM
  // (0 = north). We rotate by +180 so the arrow points DOWNWIND — that's the
  // direction sprayer drift travels, which matches the agent's mental model.
  const rotation = (direction + 180) % 360;
  return (
    <ArrowUp
      className="size-3 shrink-0"
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-label={`Wind from ${Math.round(direction)}°`}
    />
  );
}

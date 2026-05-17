import { Pause, Play } from "lucide-react";
import { cn } from "@/shared/lib/cn.ts";
import { formatFrameTime, type RainViewerFrame } from "../lib/rainviewer.ts";

type RadarTimelineProps = Readonly<{
  frames: ReadonlyArray<RainViewerFrame>;
  /** Index into `frames` of the slice currently shown on the map. */
  activeIndex: number;
  isPlaying: boolean;
  /** Frames at or above this index are forecast (nowcast); below is observed. */
  nowcastStartIndex: number;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
}>;

/**
 * Tiny floating control overlaid on the map: a play/pause button + a
 * native range slider scrubbing the radar frames + the active frame's
 * local-time label. Past frames render as a darker bar, nowcast as a
 * lighter primary tint — quick visual hint that we're crossing from
 * observed to forecast.
 *
 * Native `<input type="range">` instead of a custom slider so we get
 * keyboard arrow scrubbing + screen-reader value announcements for free.
 */
export function RadarTimeline({
  frames,
  activeIndex,
  isPlaying,
  nowcastStartIndex,
  onIndexChange,
  onTogglePlay,
}: RadarTimelineProps) {
  if (frames.length === 0) return null;
  const activeFrame = frames[activeIndex] ?? frames[0];
  if (!activeFrame) return null;
  const isForecast = activeIndex >= nowcastStartIndex;

  return (
    <div className="pointer-events-none absolute right-2 bottom-13 left-2 z-[1000] flex justify-center">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 px-2 py-1.5 shadow-md backdrop-blur-sm">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause radar animation" : "Play radar animation"}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
            "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
          )}
        >
          {isPlaying ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={frames.length - 1}
          step={1}
          value={activeIndex}
          onChange={(event) => onIndexChange(Number(event.target.value))}
          aria-label="Radar timeline"
          aria-valuetext={formatFrameTime(activeFrame.time)}
          className={cn(
            "h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full",
            // Background gradient: dark navy up to nowcastStart, primary
            // green beyond — a static "you are entering forecast" cue.
            isForecast ? "bg-[var(--color-primary-light)]" : "bg-[var(--color-border-subtle)]",
          )}
        />

        <span
          className={cn(
            "w-12 shrink-0 text-right font-mono text-xs tabular-nums",
            isForecast
              ? "font-medium text-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)]",
          )}
        >
          {formatFrameTime(activeFrame.time)}
        </span>
      </div>
    </div>
  );
}

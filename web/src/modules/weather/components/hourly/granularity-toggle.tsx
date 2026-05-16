import type { SliceHours } from "../../lib/slice-hourly.ts";
import { GranularityOption } from "./granularity-option.tsx";

type GranularityToggleProps = Readonly<{
  value: SliceHours;
  onChange: (hours: SliceHours) => void;
}>;

/**
 * Two-option segmented control that flips the hourly table's slice
 * resolution between 3 h (broad windows, 8 rows) and 1 h (every upstream
 * entry, 24 rows). The container is the ARIA `radiogroup`; the
 * `<GranularityOption>` buttons are the radios.
 */
export function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Hourly slice granularity"
      className="inline-flex rounded-md border border-[var(--color-border-subtle)] p-0.5"
    >
      <GranularityOption value={3} current={value} label="3 h" onSelect={onChange} />
      <GranularityOption value={1} current={value} label="1 h" onSelect={onChange} />
    </div>
  );
}

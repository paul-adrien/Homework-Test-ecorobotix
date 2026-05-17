/**
 * biome-ignore-all lint/a11y/useSemanticElements: `<output>` is phrasing
 * content and cannot legally contain a `<table>` (flow content); the
 * `role="status"` on the wrapping `<div>` is the correct semantic for a
 * tabular loading skeleton.
 */
import { Skeleton } from "@/shared/ui/skeleton.tsx";
import type { SliceHours } from "../../lib/slice-hourly.ts";

type HourlyTableSkeletonProps = Readonly<{
  /** Same toggle as the real table — sizes the skeleton to the row count
   * the agent is about to see (8 rows for 3 h, 24 for 1 h). */
  sliceHours: SliceHours;
}>;

/**
 * Placeholder for `HourlyTable` shown while the hourly query is pending.
 * Mirrors the real table's columns and row-count so swapping in the data
 * doesn't reflow the page. Skeleton cells use the chip geometry of the
 * real cells (h-6 rounded-md) so the loading state already reads as
 * "chips coming up".
 */
export function HourlyTableSkeleton({ sliceHours }: HourlyTableSkeletonProps) {
  const rowCount = 24 / sliceHours;
  const rowIndices = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <div
      role="status"
      aria-label="Loading hourly forecast"
      className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
    >
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead className="border-[var(--color-border-subtle)] border-b bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] text-xs">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-left">
              <Skeleton className="h-3 w-12" />
            </th>
            {[0, 1, 2, 3].map((i) => (
              <th key={i} scope="col" className="px-2 py-2.5">
                <Skeleton className="mx-auto h-3 w-10" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {rowIndices.map((row) => (
            <tr key={row}>
              <td className="px-3 py-2">
                <Skeleton className="h-4 w-10" />
              </td>
              {[0, 1, 2, 3].map((col) => (
                <td key={col} className="px-1 py-2 sm:px-2">
                  <Skeleton className="h-6 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

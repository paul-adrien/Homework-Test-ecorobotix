import { Skeleton } from "@/shared/ui/skeleton.tsx";

type DailySummaryTableSkeletonProps = Readonly<{
  /** Number of day-columns to render. Defaults to 7 (the forecast horizon). */
  days?: number;
}>;

const METRIC_ROWS = 4;

/**
 * Placeholder for `DailySummaryTable` shown while the bundle query is
 * pending. Matches the real table's geometry (sticky first column,
 * day-column headers, four metric rows) so the layout doesn't jump when
 * the data lands — the agent reads "this section is loading" instead of
 * "a generic spinner sat where my forecast will appear".
 */
export function DailySummaryTableSkeleton({ days = 7 }: DailySummaryTableSkeletonProps) {
  const dayIndices = Array.from({ length: days }, (_, i) => i);
  const metricIndices = Array.from({ length: METRIC_ROWS }, (_, i) => i);

  return (
    <div
      role="status"
      aria-label="Loading daily forecast"
      className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-[var(--color-border-subtle)] border-b">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[3rem] border-[var(--color-border-subtle)] border-r bg-[var(--color-surface-alt)] px-1 py-2 sm:min-w-[7rem] sm:px-3"
            />
            {dayIndices.map((i) => (
              <th key={i} scope="col" className="min-w-[4rem] px-1 py-2.5 sm:min-w-[5rem] sm:px-2">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-5 w-5" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {metricIndices.map((row) => (
            <tr key={row}>
              <th
                scope="row"
                className="sticky left-0 z-10 min-w-[3rem] border-[var(--color-border-subtle)] border-r bg-[var(--color-surface-alt)] px-1 py-2 sm:min-w-[7rem] sm:px-3"
              >
                <Skeleton className="mx-auto h-4 w-4 sm:mx-0 sm:w-16" />
              </th>
              {dayIndices.map((i) => (
                <td key={i} className="px-1 py-2 sm:px-2">
                  <Skeleton className="h-7 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

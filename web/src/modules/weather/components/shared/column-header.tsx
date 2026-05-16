import type { LucideIcon } from "lucide-react";

type ColumnHeaderProps = Readonly<{
  icon: LucideIcon;
  label: string;
  unit: string;
}>;

/**
 * Generic `<th scope="col">` used in both the hourly table and the
 * (transposed) daily table where the metric labels live in column headers
 * on desktop. On mobile (`< sm`) the label + unit collapse to icon-only so
 * the table fits without horizontal scroll; the text stays accessible to
 * screen readers via `sr-only sm:not-sr-only`.
 */
export function ColumnHeader({ icon: Icon, label, unit }: ColumnHeaderProps) {
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

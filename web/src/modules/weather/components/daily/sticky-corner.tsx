/**
 * Empty top-left cell of the transposed daily table. Acts as the visual
 * extension of the sticky metric-label column into the header row so the
 * gridlines stay continuous when the table scrolls horizontally on mobile.
 */
export function StickyCorner() {
  return (
    <th
      scope="col"
      className="sticky left-0 z-10 min-w-[3rem] border-[var(--color-border-subtle)] border-r bg-[var(--color-surface-alt)] px-1 py-2 sm:min-w-[7rem] sm:px-3"
    />
  );
}

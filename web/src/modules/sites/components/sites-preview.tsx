import type { SitePublic } from "@agriwatch/shared";

type SitesPreviewProps = Readonly<{
  sites: SitePublic[];
}>;

/**
 * Temporary stand-in for the real sidebar + map + forecast dashboard layout
 * (lands in Phase 2.C4). Lists every site as a card so we can validate the
 * create flow end-to-end.
 */
export function SitesPreview({ sites }: SitesPreviewProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-2xl text-[var(--color-text-primary)]">
        Your sites ({sites.length})
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <li
            key={site.id}
            className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
          >
            <h3 className="font-medium text-[var(--color-text-primary)]">{site.label}</h3>
            {site.displayName ? (
              <p className="text-[var(--color-text-secondary)] text-xs">{site.displayName}</p>
            ) : null}
            <p className="mt-2 font-mono text-[var(--color-text-muted)] text-xs">
              {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

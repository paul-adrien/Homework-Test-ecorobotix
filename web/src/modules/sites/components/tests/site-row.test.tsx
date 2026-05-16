import type { SitePublic, UserPreferences } from "@agriwatch/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { preferencesQueryKey } from "@/modules/preferences/hooks/use-preferences.ts";
import * as preferencesApi from "../../../preferences/api/preferences.api.ts";
import * as sitesApi from "../../api/sites.api.ts";
import { SiteRow } from "../site-row.tsx";

vi.mock("../../api/sites.api.ts", () => ({
  listSites: vi.fn(),
  createSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
}));

vi.mock("../../../preferences/api/preferences.api.ts", () => ({
  fetchPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

const site: SitePublic = {
  id: "site-1",
  label: "North field",
  displayName: "Yverdon, Switzerland",
  latitude: 46.78,
  longitude: 6.64,
  countryCode: "CH",
  timezone: "Europe/Zurich",
  cropType: null,
  createdAt: "2026-05-14T08:00:00.000Z",
  updatedAt: "2026-05-14T08:00:00.000Z",
};

const DEFAULT_PREFERENCES: UserPreferences = {
  temperatureUnit: "celsius",
  defaultSiteId: null,
};

function renderRow(
  options: { isSelected?: boolean; onSelect?: () => void; preferences?: UserPreferences } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  // Seed the preferences cache so `usePreferences()` resolves synchronously
  // and the heart renders its real default-vs-not state. Tests that care
  // about specific preferences pass them in; the rest get the default blob.
  queryClient.setQueryData(preferencesQueryKey, options.preferences ?? DEFAULT_PREFERENCES);
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  const onSelect = options.onSelect ?? vi.fn();
  return {
    ...render(
      <ul>
        <SiteRow site={site} isSelected={options.isSelected ?? false} onSelect={onSelect} />
      </ul>,
      { wrapper: Wrapper },
    ),
    onSelect,
    queryClient,
  };
}

/** The select button has no aria-label — its accessible name is computed
 * from the visible row text (label + sub-line). The action buttons all
 * carry aria-labels containing "default" / "delete" / "confirm", so
 * filtering those out leaves exactly the select button. */
function getSelectButton(): HTMLElement {
  const button = screen
    .getAllByRole("button")
    .find((b) => !/default|delete|confirm/i.test(b.getAttribute("aria-label") ?? ""));
  if (!button) throw new Error("Select button not found");
  return button;
}

describe("SiteRow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // The mutation invalidates the preferences cache on settle, which
    // triggers a background refetch. Stub `fetchPreferences` so the
    // refetch resolves quietly instead of warning "Query data cannot be
    // undefined".
    vi.mocked(preferencesApi.fetchPreferences).mockResolvedValue(DEFAULT_PREFERENCES);
  });

  it("renders the site label and display name inside the row", () => {
    renderRow();
    expect(getSelectButton()).toHaveTextContent(/north field/i);
    expect(screen.getByText(/yverdon, switzerland/i)).toBeInTheDocument();
  });

  it("calls onSelect with the site id when the row body is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderRow({ onSelect });

    await user.click(getSelectButton());

    expect(onSelect).toHaveBeenCalledWith("site-1");
  });

  it("renders the heart with aria-pressed=false when this site is not the default", () => {
    renderRow({
      preferences: { temperatureUnit: "celsius", defaultSiteId: "other-site" },
    });
    const heart = screen.getByRole("button", { name: /set "north field" as default site/i });
    expect(heart).toHaveAttribute("aria-pressed", "false");
  });

  it("renders the heart with aria-pressed=true when this site is the default", () => {
    renderRow({
      preferences: { temperatureUnit: "celsius", defaultSiteId: "site-1" },
    });
    const heart = screen.getByRole("button", { name: /unset "north field" as default site/i });
    expect(heart).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles the heart by patching defaultSiteId to this site when it isn't the default", async () => {
    vi.mocked(preferencesApi.updatePreferences).mockResolvedValue({
      temperatureUnit: "celsius",
      defaultSiteId: "site-1",
    });
    const user = userEvent.setup();
    renderRow({
      preferences: { temperatureUnit: "celsius", defaultSiteId: null },
    });

    await user.click(screen.getByRole("button", { name: /set "north field" as default site/i }));

    // TanStack Query passes a context as the 2nd arg to mutationFn — we
    // only assert on the payload here.
    await waitFor(() =>
      expect(preferencesApi.updatePreferences).toHaveBeenCalledWith(
        { defaultSiteId: "site-1" },
        expect.anything(),
      ),
    );
  });

  it("clears the default by patching defaultSiteId to null when the heart is already filled", async () => {
    vi.mocked(preferencesApi.updatePreferences).mockResolvedValue({
      temperatureUnit: "celsius",
      defaultSiteId: null,
    });
    const user = userEvent.setup();
    renderRow({
      preferences: { temperatureUnit: "celsius", defaultSiteId: "site-1" },
    });

    await user.click(screen.getByRole("button", { name: /unset "north field" as default site/i }));

    await waitFor(() =>
      expect(preferencesApi.updatePreferences).toHaveBeenCalledWith(
        { defaultSiteId: null },
        expect.anything(),
      ),
    );
  });

  it("delegates delete to the inner two-tap button (arm + confirm fires the mutation)", async () => {
    vi.mocked(sitesApi.deleteSite).mockResolvedValue(undefined);
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: /^delete "north field"/i })); // arm
    fireEvent.click(screen.getByRole("button", { name: /^confirm delete "north field"/i }));

    await waitFor(() =>
      expect(sitesApi.deleteSite).toHaveBeenCalledWith("site-1", expect.anything()),
    );
  });
});

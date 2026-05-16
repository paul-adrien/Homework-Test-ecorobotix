import type { SitePublic } from "@agriwatch/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/shared/test/render-with-providers.tsx";
import * as sitesApi from "../../api/sites.api.ts";
import { DeleteSiteButton } from "../delete-site-button.tsx";

vi.mock("../../api/sites.api.ts", () => ({
  listSites: vi.fn(),
  createSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
}));

const site: SitePublic = {
  id: "site-1",
  label: "North field",
  displayName: "North field — wheat 2026",
  latitude: 46.78,
  longitude: 6.64,
  countryCode: null,
  timezone: null,
  cropType: null,
  createdAt: "2026-05-14T08:00:00.000Z",
  updatedAt: "2026-05-14T08:00:00.000Z",
};

describe("DeleteSiteButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not fire the delete on the first click — it arms the button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DeleteSiteButton site={site} />);

    await user.click(screen.getByRole("button", { name: /^delete "north field"/i }));

    expect(sitesApi.deleteSite).not.toHaveBeenCalled();
    // The aria-label flips to "Confirm delete …" once armed.
    expect(
      screen.getByRole("button", { name: /^confirm delete "north field"/i }),
    ).toBeInTheDocument();
  });

  it("fires the delete on the second click and notifies the parent", async () => {
    vi.mocked(sitesApi.deleteSite).mockResolvedValueOnce(undefined);
    const onAfterDelete = vi.fn();
    renderWithProviders(<DeleteSiteButton site={site} onAfterDelete={onAfterDelete} />);

    // fireEvent.click dispatches a bare click without the pointerdown
    // prelude — the outside-click listener (on pointerdown, capture phase)
    // is only relevant for clicks OFF the button; for the "click again on
    // the same button to confirm" path we just need the click events.
    fireEvent.click(screen.getByRole("button", { name: /^delete "north field"/i })); // arm
    fireEvent.click(screen.getByRole("button", { name: /^confirm delete "north field"/i })); // confirm

    // TanStack Query passes a context object (client, meta, mutationKey) as
    // the second arg to mutationFn — we only care about the site id here.
    await waitFor(() =>
      expect(sitesApi.deleteSite).toHaveBeenCalledWith("site-1", expect.anything()),
    );
    await waitFor(() => expect(onAfterDelete).toHaveBeenCalledWith("site-1"));
  });

  it("cancels the armed state when the user clicks outside the button", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <DeleteSiteButton site={site} />
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /^delete "north field"/i }));
    expect(
      screen.getByRole("button", { name: /^confirm delete "north field"/i }),
    ).toBeInTheDocument();

    // A click anywhere off the delete button — including another button —
    // should disarm without firing the delete.
    await user.click(screen.getByTestId("outside"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete "north field"/i })).toBeInTheDocument(),
    );
    expect(sitesApi.deleteSite).not.toHaveBeenCalled();
  });
});

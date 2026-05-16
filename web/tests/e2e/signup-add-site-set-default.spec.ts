import { expect, test } from "@playwright/test";

/**
 * End-to-end happy path #1 from CLAUDE.md §11:
 *  signup → empty state → add site (via geocoding search) → wait for the
 *  forecast → heart-toggle as default.
 *
 * The test uses a unique email per run so it never collides with prior
 * runs (no DB reset needed between runs). It picks the search flow
 * (rather than lat/lng coordinates) because that's the more common path
 * an agent uses — Open-Meteo geocoding for a city name.
 * Weather and geocoding call upstream (Open-Meteo) — accepted as part of
 * the integration scope; if the network flakes the test will retry on CI.
 */
test("signup, add a site via geocoding, view the forecast, set it as default", async ({ page }) => {
  // crypto.randomUUID guarantees uniqueness across parallel workers (a
  // millisecond timestamp can collide when chromium + mobile-chrome run
  // the same test in parallel).
  const email = `e2e-${crypto.randomUUID()}@agriwatch.test`;
  const password = "test-password-12345";

  // 1. Signup → dashboard auto-redirect
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  // 2. Empty state lands first because the new user has zero sites
  await expect(page.getByRole("heading", { name: /add your first site/i })).toBeVisible();

  // 3. Open the create dialog (defaults to search mode)
  await page.getByRole("button", { name: /search a location/i }).click();

  // 4. Type a city — Open-Meteo geocoding returns a few suggestions.
  await page.getByPlaceholder(/yverdon, lausanne/i).fill("Yverdon");

  // 5. Pick the first suggestion. The "Yverdon" geocoding result starts
  //    the entry text with "Yverdon" (city name) — match it loosely so
  //    we don't depend on the exact Open-Meteo response format.
  await page
    .getByRole("button", { name: /yverdon/i })
    .first()
    .click();

  // 6. Override the auto-filled label so the later assertions can match
  //    a stable string regardless of what the geocoder returned.
  const siteLabel = "E2E North field";
  await page.getByLabel(/name this site/i).fill(siteLabel);

  // 7. Save and wait for the dialog to close.
  await page.getByRole("button", { name: /save site/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // 6. The new site appears in the row list (sidebar on desktop / drawer
  //    trigger on mobile — both render a button carrying the label).
  const siteEntry = page.getByRole("button", { name: new RegExp(siteLabel, "i") });
  await expect(siteEntry.first()).toBeVisible();

  // 7. Forecast section renders — the temp unit toggle (segmented radio
  //    control) lands as soon as the bundle resolves. Generous timeout
  //    because the real Open-Meteo call is on the path.
  await expect(page.getByRole("radio", { name: /^°C$/ })).toBeVisible({ timeout: 15_000 });
  // Daily table — every metric row carries an accessible name through its
  // `<th scope="row">`; "temp" is the first one.
  await expect(page.getByRole("rowheader", { name: /temp/i })).toBeVisible({ timeout: 15_000 });

  // 8. Heart toggle — initially empty (not default), click to set as
  //    default, assert aria-pressed flips. On mobile the sidebar collapses
  //    into a drawer; open it so the heart is mounted (locator re-evaluates
  //    on each `.isVisible()` call so the same handle works either way).
  const heart = page.getByRole("button", {
    name: new RegExp(`set "${siteLabel}" as default`, "i"),
  });
  if (!(await heart.isVisible().catch(() => false))) {
    await page
      .getByRole("button", { name: new RegExp(siteLabel, "i") })
      .first()
      .click();
  }
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(
    page.getByRole("button", { name: new RegExp(`unset "${siteLabel}" as default`, "i") }),
  ).toHaveAttribute("aria-pressed", "true");
});

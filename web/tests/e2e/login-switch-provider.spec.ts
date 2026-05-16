import { expect, test } from "@playwright/test";

/**
 * End-to-end happy path #2 from CLAUDE.md §11:
 *  login as the seeded user → forecast renders for the seeded site →
 *  switch the source from Open-Meteo to Yr.no → assert the trigger
 *  shows the new selection.
 *
 * Prerequisite: `pnpm --filter api db:seed` has been run (the demo user
 * `agent@agriwatch.demo` and its sample site must exist).
 */
test("login as the seeded user, then switch the weather source", async ({ page }) => {
  // 1. Login
  await page.goto("/login");
  await page.getByLabel("Email").fill("agent@agriwatch.demo");
  await page.getByLabel("Password").fill("agriwatch");
  await page.getByRole("button", { name: /sign in/i }).click();

  // 2. Dashboard mounts with the seeded site auto-selected.
  await expect(page.getByRole("button", { name: /demo site — yverdon/i }).first()).toBeVisible({
    timeout: 10_000,
  });

  // 3. Forecast bundle resolves — wait for the daily table to be on screen.
  await expect(page.getByRole("rowheader", { name: /temp/i })).toBeVisible({ timeout: 15_000 });

  // 4. Open the provider switcher and read its current value.
  const switcher = page.getByRole("combobox", { name: /weather data source/i });
  await expect(switcher).toBeVisible();
  // The default selection auto-pins to the first available entry — Open-Meteo
  // is the first registry entry in production.
  await expect(switcher).toContainText(/open-meteo/i);

  // 5. Switch to Yr.no.
  await switcher.click();
  await page.getByRole("option", { name: /^yr\.no$/i }).click();

  // 6. The trigger label flips to "Yr.no" — proves the selection landed
  //    in the component's state and the dropdown closed cleanly.
  await expect(switcher).toContainText(/yr\.no/i);

  // 7. The new query fires; the daily table re-renders. We don't assert
  //    on the values themselves (real APIs can drift) — just that the
  //    table is still visible and Temp row is still there, i.e. no error
  //    alert took over.
  await expect(page.getByRole("rowheader", { name: /temp/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("alert")).not.toBeVisible();
});

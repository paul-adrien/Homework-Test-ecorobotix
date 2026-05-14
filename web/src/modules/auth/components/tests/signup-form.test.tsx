import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error.ts";
import { renderWithProviders } from "@/shared/test/render-with-providers.tsx";
import * as authApi from "../../api/auth.api.ts";
import { SignupForm } from "../signup-form.tsx";

vi.mock("../../api/auth.api.ts", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}));

describe("SignupForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("submits valid input, calls the signup API, and invokes onSuccess", async () => {
    vi.mocked(authApi.signup).mockResolvedValueOnce({
      id: "u-1",
      email: "new@example.com",
      createdAt: "2026-05-14T08:00:00.000Z",
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<SignupForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "strong-password-123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(authApi.signup).toHaveBeenCalled(), { timeout: 3000 });
    // TanStack Query passes a context object as the second arg to mutationFn — we only care
    // about the input variables here, so use expect.anything() for the context.
    expect(authApi.signup).toHaveBeenCalledWith(
      { email: "new@example.com", password: "strong-password-123" },
      expect.anything(),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("rejects a password shorter than 12 characters with a Zod error", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/password must be at least 12 characters/i)).toBeInTheDocument();
    expect(authApi.signup).not.toHaveBeenCalled();
  });

  it("renders the server error returned by the API when the email is already taken", async () => {
    vi.mocked(authApi.signup).mockRejectedValueOnce(
      new ApiError(409, 'An account with email "taken@example.com" already exists.'),
    );
    const user = userEvent.setup();

    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText(/email/i), "taken@example.com");
    await user.type(screen.getByLabelText(/password/i), "strong-password-123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });
});

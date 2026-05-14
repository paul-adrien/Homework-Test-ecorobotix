import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error.ts";
import { renderWithProviders } from "@/shared/test/render-with-providers.tsx";
import * as authApi from "../../api/auth.api.ts";
import { LoginForm } from "../login-form.tsx";

vi.mock("../../api/auth.api.ts", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("submits valid credentials, calls the login API, and invokes onSuccess", async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      id: "u-1",
      email: "agent@example.com",
      createdAt: "2026-05-14T08:00:00.000Z",
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), "agent@example.com");
    await user.type(screen.getByLabelText(/password/i), "any-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(authApi.login).toHaveBeenCalled(), { timeout: 3000 });
    // TanStack Query passes a context object as the second arg to mutationFn — we only care
    // about the input variables here, so use expect.anything() for the context.
    expect(authApi.login).toHaveBeenCalledWith(
      { email: "agent@example.com", password: "any-password" },
      expect.anything(),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("displays Zod validation errors and does not call the API for invalid input", async () => {
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("renders the server error returned by the API in an alert", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new ApiError(401, "Invalid email or password."));
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "agent@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email or password/i);
  });
});

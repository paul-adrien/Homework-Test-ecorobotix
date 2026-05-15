import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCurrentUser } from "@/modules/auth/hooks/use-current-user.ts";
import { useLogoutMutation } from "@/modules/auth/hooks/use-logout-mutation.ts";
import { Button } from "@/shared/ui/button.tsx";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Shared shell for every dashboard view: brand header on top (AgriWatch +
 * current user identity + sign-out), a main content area below. Pages
 * compose around it via `children` instead of duplicating the header.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface-alt)]">
      <header className="border-[var(--color-border-subtle)] border-b bg-[var(--color-dark-navy)] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="font-semibold text-xl tracking-tight">AgriWatch</h1>
          <div className="flex items-center gap-4 text-sm">
            {user ? <span className="text-white/80">{user.email}</span> : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              disabled={logoutMutation.isPending}
              onClick={() =>
                logoutMutation.mutate(undefined, {
                  onSuccess: () => navigate({ to: "/login" }),
                })
              }
            >
              {logoutMutation.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card.tsx";

type AuthLayoutProps = Readonly<{
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}>;

/**
 * Shared visual shell for the login and signup pages: AgriWatch heading,
 * gradient background, centered card with title / description / form / footer.
 * Page components stay focused on their content (which form, where to link
 * to, where to redirect after success).
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--color-background)] p-6">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="font-semibold text-3xl text-[var(--color-dark-navy)] tracking-tight">
            AgriWatch
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Weather monitoring for field agents
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-center text-sm text-[var(--color-text-secondary)]">
            {footer}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

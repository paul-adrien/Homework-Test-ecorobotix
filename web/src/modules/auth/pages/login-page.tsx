import { Link, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card.tsx";
import { LoginForm } from "../components/login-form.tsx";

export function LoginPage() {
  const navigate = useNavigate();

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
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to access your parcels.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm onSuccess={() => navigate({ to: "/" })} />
          </CardContent>
          <CardFooter className="justify-center text-sm text-[var(--color-text-secondary)]">
            <span>
              No account yet?{" "}
              <Link
                to="/signup"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Create one
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

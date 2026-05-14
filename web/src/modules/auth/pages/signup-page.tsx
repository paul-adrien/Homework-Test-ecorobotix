import { Link, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card.tsx";
import { SignupForm } from "../components/signup-form.tsx";

export function SignupPage() {
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
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Track multiple parcels and their forecasts in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm onSuccess={() => navigate({ to: "/" })} />
          </CardContent>
          <CardFooter className="justify-center text-sm text-[var(--color-text-secondary)]">
            <span>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

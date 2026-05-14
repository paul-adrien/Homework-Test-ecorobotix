import { Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "../components/auth-layout.tsx";
import { LoginForm } from "../components/login-form.tsx";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to access your parcels."
      footer={
        <span>
          No account yet?{" "}
          <Link to="/signup" className="font-medium text-[var(--color-primary)] hover:underline">
            Create one
          </Link>
        </span>
      }
    >
      <LoginForm onSuccess={() => navigate({ to: "/" })} />
    </AuthLayout>
  );
}

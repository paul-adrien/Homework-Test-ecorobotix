import { Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "../components/auth-layout.tsx";
import { SignupForm } from "../components/signup-form.tsx";

export function SignupPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Create your account"
      description="Track multiple parcels and their forecasts in one place."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <SignupForm onSuccess={() => navigate({ to: "/" })} />
    </AuthLayout>
  );
}

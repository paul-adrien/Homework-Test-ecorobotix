import { type SignupInput, signupSchema } from "@agriwatch/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toServerErrorMessage } from "@/shared/api/api-error.ts";
import { Alert, AlertDescription } from "@/shared/ui/alert.tsx";
import { Button } from "@/shared/ui/button.tsx";
import { FormError, FormField } from "@/shared/ui/field.tsx";
import { Input } from "@/shared/ui/input.tsx";
import { Label } from "@/shared/ui/label.tsx";
import { useSignupMutation } from "../hooks/use-signup-mutation.ts";

type SignupFormProps = Readonly<{
  onSuccess?: () => void;
}>;

export function SignupForm({ onSuccess }: SignupFormProps) {
  const signupMutation = useSignupMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit((values) => {
    signupMutation.mutate(values, {
      onSuccess: () => onSuccess?.(),
    });
  });

  const serverError = toServerErrorMessage(signupMutation.error);

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <FormField>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
          {...register("email")}
        />
        <FormError id="signup-email-error">{errors.email?.message}</FormError>
      </FormField>

      <FormField>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "signup-password-error" : undefined}
          {...register("password")}
        />
        <FormError id="signup-password-error">{errors.password?.message}</FormError>
        <p className="text-xs text-[var(--color-text-secondary)]">At least 12 characters.</p>
      </FormField>

      <Button type="submit" disabled={isSubmitting || signupMutation.isPending} size="lg">
        {signupMutation.isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

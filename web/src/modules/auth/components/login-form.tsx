import { type LoginInput, loginSchema } from "@agriwatch/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toServerErrorMessage } from "@/shared/api/api-error.ts";
import { Alert, AlertDescription } from "@/shared/ui/alert.tsx";
import { Button } from "@/shared/ui/button.tsx";
import { FormError, FormField } from "@/shared/ui/field.tsx";
import { Input } from "@/shared/ui/input.tsx";
import { Label } from "@/shared/ui/label.tsx";
import { useLoginMutation } from "../hooks/use-login-mutation.ts";

type LoginFormProps = Readonly<{
  onSuccess?: () => void;
}>;

export function LoginForm({ onSuccess }: LoginFormProps) {
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => onSuccess?.(),
    });
  });

  const serverError = toServerErrorMessage(loginMutation.error);

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <FormField>
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...register("email")}
        />
        <FormError id="login-email-error">{errors.email?.message}</FormError>
      </FormField>

      <FormField>
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          {...register("password")}
        />
        <FormError id="login-password-error">{errors.password?.message}</FormError>
      </FormField>

      <Button type="submit" disabled={isSubmitting || loginMutation.isPending} size="lg">
        {loginMutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

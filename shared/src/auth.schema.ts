import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Invalid email address");

// MVP password rule: minimum 12 characters. Strength checks (uppercase, digits, symbols,
// breach lookup) are out of scope — documented as future improvements in the README.
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200, "Password is too long");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Shape of the user returned to the client. Never includes passwordHash.
 */
export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;

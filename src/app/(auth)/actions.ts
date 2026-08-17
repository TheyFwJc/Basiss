"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import {
  loginSchema,
  signUpSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { generateResetToken, hashResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export type ActionState = {
  error?: string;
  message?: string;
  devResetUrl?: string;
} | null;

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }
}

export async function signUpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      settings: { create: {} },
    },
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Account created, but automatic sign-in failed. Please log in.",
      };
    }
    throw error;
  }
}

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const genericMessage =
    "If an account exists for that email, a password reset link has been generated.";

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    // Do not reveal whether the email is registered.
    return { message: genericMessage };
  }

  const { rawToken, hashedToken } = generateResetToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  const resetUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/reset-password/${rawToken}`;

  const emailSent = await sendPasswordResetEmail(user.email, resetUrl);
  if (emailSent) {
    return { message: genericMessage };
  }

  // No email provider configured (or the send failed) — never hand the
  // working reset link back to whoever submitted the form outside of local
  // development. Doing so in production would let anyone take over any
  // account just by knowing its email address.
  if (process.env.NODE_ENV !== "production") {
    return { message: genericMessage, devResetUrl: resetUrl };
  }

  console.error(
    `Password reset requested for ${user.email} but no email could be sent — set RESEND_API_KEY.`
  );
  return { message: genericMessage };
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const hashedToken = hashResetToken(parsed.data.token);
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token: hashedToken },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { message: "Your password has been reset. You can now log in." };
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profileSchema, preferencesSchema } from "@/lib/validations/settings";

export type ActionState = { error?: string; message?: string } | null;

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/settings");
  return { message: "Profile updated." };
}

export async function updatePreferencesAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const parsed = preferencesSchema.safeParse({
    timezone: formData.get("timezone"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  // Unchecked checkboxes are simply absent from FormData, not "false".
  const notificationsEnabled = formData.get("notificationsEnabled") != null;

  await db.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      timezone: parsed.data.timezone,
      baseCurrency: parsed.data.baseCurrency,
      notificationsEnabled,
    },
    update: {
      timezone: parsed.data.timezone,
      baseCurrency: parsed.data.baseCurrency,
      notificationsEnabled,
    },
  });

  revalidatePath("/settings");
  return { message: "Preferences updated." };
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { riskSettingsSchema } from "@/lib/validations/risk";

export type ActionState = { error?: string; message?: string } | null;

export async function updateRiskSettingsAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const parsed = riskSettingsSchema.safeParse({
    defaultRiskPerTradePct: formData.get("defaultRiskPerTradePct"),
    maxDailyLossPct: formData.get("maxDailyLossPct"),
    maxWeeklyLossPct: formData.get("maxWeeklyLossPct"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = {
    defaultRiskPerTradePct: parsed.data.defaultRiskPerTradePct?.toString() ?? null,
    maxDailyLossPct: parsed.data.maxDailyLossPct?.toString() ?? null,
    maxWeeklyLossPct: parsed.data.maxWeeklyLossPct?.toString() ?? null,
  };

  await db.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  revalidatePath("/risk");
  return { message: "Risk settings saved." };
}

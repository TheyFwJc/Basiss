"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { strategySchema } from "@/lib/validations/strategy";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function parseForm(formData: FormData) {
  return strategySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    entryCriteria: formData.get("entryCriteria"),
    exitCriteria: formData.get("exitCriteria"),
    stopLossRules: formData.get("stopLossRules"),
    takeProfitRules: formData.get("takeProfitRules"),
    timeframe: formData.get("timeframe"),
    marketConditions: formData.get("marketConditions"),
  });
}

export async function createStrategyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.strategy.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      entryCriteria: parsed.data.entryCriteria || null,
      exitCriteria: parsed.data.exitCriteria || null,
      stopLossRules: parsed.data.stopLossRules || null,
      takeProfitRules: parsed.data.takeProfitRules || null,
      timeframe: parsed.data.timeframe || null,
      marketConditions: parsed.data.marketConditions || null,
    },
  });

  revalidatePath("/strategies");
  return null;
}

export async function updateStrategyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing strategy id." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { count } = await db.strategy.updateMany({
    where: { id, userId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      entryCriteria: parsed.data.entryCriteria || null,
      exitCriteria: parsed.data.exitCriteria || null,
      stopLossRules: parsed.data.stopLossRules || null,
      takeProfitRules: parsed.data.takeProfitRules || null,
      timeframe: parsed.data.timeframe || null,
      marketConditions: parsed.data.marketConditions || null,
    },
  });
  if (count === 0) return { error: "Strategy not found." };

  revalidatePath("/strategies");
  return null;
}

export async function deleteStrategyAction(id: string) {
  const userId = await requireUserId();
  await db.strategy.deleteMany({ where: { id, userId } });
  revalidatePath("/strategies");
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { goalSchema } from "@/lib/validations/goal";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function parseForm(formData: FormData) {
  return goalSchema.safeParse({
    metric: formData.get("metric"),
    period: formData.get("period"),
    targetValue: formData.get("targetValue"),
  });
}

export async function createGoalAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.goal.create({
    data: {
      userId,
      metric: parsed.data.metric,
      period: parsed.data.period,
      targetValue: parsed.data.targetValue.toString(),
    },
  });

  revalidatePath("/goals");
  return null;
}

export async function updateGoalAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing goal id." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { count } = await db.goal.updateMany({
    where: { id, userId },
    data: {
      metric: parsed.data.metric,
      period: parsed.data.period,
      targetValue: parsed.data.targetValue.toString(),
    },
  });
  if (count === 0) return { error: "Goal not found." };

  revalidatePath("/goals");
  return null;
}

export async function deleteGoalAction(id: string) {
  const userId = await requireUserId();
  await db.goal.deleteMany({ where: { id, userId } });
  revalidatePath("/goals");
}

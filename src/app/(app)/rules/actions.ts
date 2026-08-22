"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ruleSchema } from "@/lib/validations/rule";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function parseForm(formData: FormData) {
  return ruleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
}

export async function createRuleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.rule.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
  } catch {
    return { error: "You already have a rule with that name." };
  }

  revalidatePath("/rules");
  return null;
}

export async function updateRuleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing rule id." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { count } = await db.rule.updateMany({
      where: { id, userId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
    if (count === 0) return { error: "Rule not found." };
  } catch {
    return { error: "You already have a rule with that name." };
  }

  revalidatePath("/rules");
  return null;
}

export async function deleteRuleAction(id: string) {
  const userId = await requireUserId();
  await db.rule.deleteMany({ where: { id, userId } });
  revalidatePath("/rules");
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { playbookSchema } from "@/lib/validations/playbook";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function parseForm(formData: FormData) {
  return playbookSchema.safeParse({
    name: formData.get("name"),
    setupDescription: formData.get("setupDescription"),
    entryRules: formData.get("entryRules"),
    stopRules: formData.get("stopRules"),
    targetRules: formData.get("targetRules"),
    invalidations: formData.get("invalidations"),
  });
}

export async function createPlaybookAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.playbook.create({
    data: {
      userId,
      name: parsed.data.name,
      setupDescription: parsed.data.setupDescription || null,
      entryRules: parsed.data.entryRules || null,
      stopRules: parsed.data.stopRules || null,
      targetRules: parsed.data.targetRules || null,
      invalidations: parsed.data.invalidations || null,
    },
  });

  revalidatePath("/playbooks");
  return null;
}

export async function updatePlaybookAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing playbook id." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { count } = await db.playbook.updateMany({
    where: { id, userId },
    data: {
      name: parsed.data.name,
      setupDescription: parsed.data.setupDescription || null,
      entryRules: parsed.data.entryRules || null,
      stopRules: parsed.data.stopRules || null,
      targetRules: parsed.data.targetRules || null,
      invalidations: parsed.data.invalidations || null,
    },
  });
  if (count === 0) return { error: "Playbook not found." };

  revalidatePath("/playbooks");
  return null;
}

export async function deletePlaybookAction(id: string) {
  const userId = await requireUserId();
  await db.playbook.deleteMany({ where: { id, userId } });
  revalidatePath("/playbooks");
}

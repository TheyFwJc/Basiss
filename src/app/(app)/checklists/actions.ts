"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checklistSchema } from "@/lib/validations/checklist";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

async function parseForm(userId: string, formData: FormData) {
  const parsed = checklistSchema.safeParse({
    name: formData.get("name"),
    playbookId: formData.get("playbookId"),
    itemLabels: formData.getAll("itemLabel"),
  });
  if (!parsed.success) return parsed;

  if (parsed.data.playbookId) {
    const playbook = await db.playbook.findFirst({
      where: { id: parsed.data.playbookId, userId },
    });
    if (!playbook) {
      return {
        success: false as const,
        error: { issues: [{ message: "Playbook not found." }] },
      };
    }
  }

  return parsed;
}

export async function createChecklistAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = await parseForm(userId, formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.checklist.create({
    data: {
      userId,
      name: parsed.data.name,
      playbookId: parsed.data.playbookId || null,
      items: {
        create: parsed.data.itemLabels.map((label, i) => ({
          label,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath("/checklists");
  revalidatePath("/trades");
  return null;
}

export async function updateChecklistAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing checklist id." };

  const existing = await db.checklist.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Checklist not found." };

  const parsed = await parseForm(userId, formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.$transaction([
    db.checklistItem.deleteMany({ where: { checklistId: id } }),
    db.checklist.update({
      where: { id },
      data: {
        name: parsed.data.name,
        playbookId: parsed.data.playbookId || null,
        items: {
          create: parsed.data.itemLabels.map((label, i) => ({
            label,
            sortOrder: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/checklists");
  revalidatePath("/trades");
  return null;
}

export async function deleteChecklistAction(id: string) {
  const userId = await requireUserId();
  await db.checklist.deleteMany({ where: { id, userId } });
  revalidatePath("/checklists");
  revalidatePath("/trades");
}

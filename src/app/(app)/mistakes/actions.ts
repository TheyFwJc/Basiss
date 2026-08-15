"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { mistakeSchema } from "@/lib/validations/mistake";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function parseForm(formData: FormData) {
  return mistakeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
}

export async function createMistakeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.mistake.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
  } catch {
    return { error: "You already have a mistake with that name." };
  }

  revalidatePath("/mistakes");
  revalidatePath("/trades");
  return null;
}

export async function updateMistakeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing mistake id." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { count } = await db.mistake.updateMany({
      where: { id, userId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
    if (count === 0) return { error: "Mistake not found." };
  } catch {
    return { error: "You already have a mistake with that name." };
  }

  revalidatePath("/mistakes");
  revalidatePath("/trades");
  return null;
}

export async function deleteMistakeAction(id: string) {
  const userId = await requireUserId();
  await db.mistake.deleteMany({ where: { id, userId } });
  revalidatePath("/mistakes");
  revalidatePath("/trades");
}

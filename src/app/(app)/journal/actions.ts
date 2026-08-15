"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { journalDateSchema, journalEntrySchema } from "@/lib/validations/journal";

export type ActionState = { error?: string; message?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function parseForm(formData: FormData) {
  return journalEntrySchema.safeParse({
    marketOverview: formData.get("marketOverview"),
    tradingPlan: formData.get("tradingPlan"),
    goals: formData.get("goals"),
    mentalState: formData.get("mentalState"),
    importantLevels: formData.get("importantLevels"),
    newsEvents: formData.get("newsEvents"),
    endOfDayReview: formData.get("endOfDayReview"),
    lessonsLearned: formData.get("lessonsLearned"),
  });
}

export async function saveJournalEntryAction(
  date: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsedDate = journalDateSchema.safeParse(date);
  if (!parsedDate.success) return { error: "Invalid date." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = {
    marketOverview: parsed.data.marketOverview || null,
    tradingPlan: parsed.data.tradingPlan || null,
    goals: parsed.data.goals || null,
    mentalState: parsed.data.mentalState || null,
    importantLevels: parsed.data.importantLevels || null,
    newsEvents: parsed.data.newsEvents || null,
    endOfDayReview: parsed.data.endOfDayReview || null,
    lessonsLearned: parsed.data.lessonsLearned || null,
  };

  await db.journalEntry.upsert({
    where: { userId_date: { userId, date: new Date(date) } },
    create: { userId, date: new Date(date), ...data },
    update: data,
  });

  revalidatePath("/journal");
  revalidatePath(`/journal/${date}`);
  return { message: "Journal entry saved." };
}

export async function deleteJournalEntryAction(date: string) {
  const userId = await requireUserId();
  await db.journalEntry.deleteMany({
    where: { userId, date: new Date(date) },
  });
  revalidatePath("/journal");
  redirect("/journal");
}

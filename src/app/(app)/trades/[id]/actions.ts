"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tradeReviewSchema } from "@/lib/validations/trade-review";

export type ActionState = { error?: string; message?: string } | null;

export async function updateTradeReviewAction(
  tradeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const parsed = tradeReviewSchema.safeParse({
    reviewWhatWentWell: formData.get("reviewWhatWentWell"),
    reviewWhatWentWrong: formData.get("reviewWhatWentWrong"),
    reviewWhatToChange: formData.get("reviewWhatToChange"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { count } = await db.trade.updateMany({
    where: { id: tradeId, userId: session.user.id },
    data: {
      reviewWhatWentWell: parsed.data.reviewWhatWentWell || null,
      reviewWhatWentWrong: parsed.data.reviewWhatWentWrong || null,
      reviewWhatToChange: parsed.data.reviewWhatToChange || null,
    },
  });
  if (count === 0) return { error: "Trade not found." };

  revalidatePath(`/trades/${tradeId}`);
  return { message: "Review saved." };
}

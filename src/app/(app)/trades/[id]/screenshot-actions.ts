"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isStorageConfigured, uploadScreenshot, deleteScreenshot } from "@/lib/storage";

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export type ScreenshotActionResult = { error: string } | { id: string; url: string };

export async function uploadTradeScreenshotAction(
  tradeId: string,
  formData: FormData
): Promise<ScreenshotActionResult> {
  const userId = await requireUserId();

  if (!isStorageConfigured()) {
    return {
      error:
        "Screenshot storage isn't configured yet — add BLOB_READ_WRITE_TOKEN to the server's environment to enable uploads.",
    };
  }

  const trade = await db.trade.findFirst({ where: { id: tradeId, userId } });
  if (!trade) return { error: "Trade not found." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files can be attached." };
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { error: "Images must be under 8MB." };
  }

  const { url } = await uploadScreenshot(userId, file);

  const screenshot = await db.screenshot.create({
    data: { userId, tradeId, url, kind: "OTHER" },
  });

  revalidatePath(`/trades/${tradeId}`);
  return { id: screenshot.id, url: screenshot.url };
}

export async function deleteScreenshotAction(
  screenshotId: string
): Promise<{ error: string } | { ok: true }> {
  const userId = await requireUserId();

  const screenshot = await db.screenshot.findFirst({
    where: { id: screenshotId, userId },
  });
  if (!screenshot) return { error: "Screenshot not found." };

  await deleteScreenshot(screenshot.url);
  await db.screenshot.delete({ where: { id: screenshot.id } });

  if (screenshot.tradeId) revalidatePath(`/trades/${screenshot.tradeId}`);
  return { ok: true };
}

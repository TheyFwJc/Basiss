import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Creates an in-app Notification for a one-off event (a friend request, a
 * trade rating) and, if the recipient has notifications enabled, emails
 * them too. Deliberately separate from generate-notifications.ts's
 * periodic checkX() sweep: those re-derive the same six notification types
 * from current state on every page load, while these fire once, at the
 * moment the event happens, from inside their own Server Actions.
 *
 * Only these event-driven types get emailed — the six periodic ones stay
 * in-app-only, since emailing e.g. a daily-loss-limit reminder every day
 * wasn't asked for and risks feeling spammy.
 */
export async function notifyUser(input: {
  userId: string;
  recipientEmail: string;
  emailEnabled: boolean;
  type: NotificationType;
  message: string;
  dedupeKey: string;
  link?: string;
  emailSubject: string;
  emailHtml: string;
}) {
  let created = true;
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        dedupeKey: input.dedupeKey,
        link: input.link,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      created = false; // already notified for this exact event — not an error
    } else {
      throw err;
    }
  }

  if (created && input.emailEnabled) {
    await sendEmail({
      to: input.recipientEmail,
      subject: input.emailSubject,
      html: input.emailHtml,
    });
  }
}

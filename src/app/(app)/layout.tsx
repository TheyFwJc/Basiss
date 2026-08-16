import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateNotifications } from "@/lib/generate-notifications";
import { getSubscription } from "@/lib/subscription";
import { AppShell } from "@/components/nav/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  await generateNotifications(userId);
  const [notifications, subscription] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getSubscription(userId),
  ]);

  return (
    <AppShell
      userName={session.user.name}
      userEmail={session.user.email}
      isPaidPlan={subscription.effectivePlan !== "FREE"}
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}

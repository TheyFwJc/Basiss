import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateNotifications } from "@/lib/generate-notifications";
import { getSubscription } from "@/lib/subscription";
import { AppShell } from "@/components/nav/app-shell";
import { PublicShell } from "@/components/nav/public-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    // /pricing is the one (app) route that also needs to work as a public
    // marketing page — everything else still requires a session.
    const pathname = (await headers()).get("x-pathname");
    if (pathname === "/pricing") return <PublicShell>{children}</PublicShell>;
    redirect("/login");
  }

  const userId = session.user.id;
  await generateNotifications(userId);
  const [notifications, subscription, user] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getSubscription(userId),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { welcomedAt: true } }),
  ]);

  return (
    <AppShell
      userName={session.user.name}
      userEmail={session.user.email}
      isPaidPlan={subscription.effectivePlan !== "FREE"}
      isNewUser={user.welcomedAt === null}
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

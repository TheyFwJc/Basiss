import Link from "next/link";
import { redirect } from "next/navigation";
import { LineChart } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <LineChart className="size-6 text-primary" strokeWidth={2.5} />
          Basis
        </div>
        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/login">Log in</Link>}
            nativeButton={false}
            variant="ghost"
            size="sm"
          />
          <Button
            render={<Link href="/signup">Sign up</Link>}
            nativeButton={false}
            size="sm"
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Know exactly how you trade.
        </h1>
        <p className="mt-4 max-w-lg text-balance text-muted-foreground sm:text-lg">
          Basis is a trading journal that turns your raw trade history into a
          clear picture of performance, risk, and behavior — so you can see
          what&apos;s actually working.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button
            render={<Link href="/signup">Start journaling — it&apos;s free</Link>}
            nativeButton={false}
            size="lg"
          />
          <Button
            render={<Link href="/login">Log in</Link>}
            nativeButton={false}
            variant="outline"
            size="lg"
          />
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Basis is a journaling and analytics tool. It does not provide
        personalized investment advice and does not guarantee trading
        results.
      </footer>
    </div>
  );
}

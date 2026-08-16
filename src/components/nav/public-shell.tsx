import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";

/** Minimal chrome for (app) routes that also need to render without a
 * session — currently just /pricing. No sidebar (there's no app to
 * navigate yet), just a way back to the marketing site or into auth. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <BrandMark className="size-6 text-sm" />
          Basis
        </Link>
        <div className="flex-1" />
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Sign up
        </Link>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}

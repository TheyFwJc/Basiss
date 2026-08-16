"use client";

import { usePathname } from "next/navigation";

/** Replays a quick fade/rise on every route change by remounting a keyed
 * wrapper — gives each page a bit of life on arrival without a full page
 * reload or a transitions library. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}

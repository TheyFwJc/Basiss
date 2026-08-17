import type { NextAuthConfig } from "next-auth";

// Lemon Squeezy's webhook has no user session — it authenticates via
// signature verification instead (see
// src/app/api/lemonsqueezy/webhook/route.ts). The TradingView webhook
// likewise has no session — it's the URL's token that authenticates it
// instead (see src/app/api/tradingview/webhook/[token]/route.ts).
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/reset-password",
  "/pricing",
  "/api/lemonsqueezy/webhook",
  "/api/tradingview/webhook",
];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/" ||
        PUBLIC_PATHS.some((path) => pathname.startsWith(path));

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;

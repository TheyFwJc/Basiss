import type { NextAuthConfig } from "next-auth";

// Stripe's webhook has no user session — it authenticates via signature
// verification instead (see src/app/api/stripe/webhook/route.ts).
const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/api/stripe/webhook"];

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

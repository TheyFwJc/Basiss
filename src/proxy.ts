import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Forwards the request pathname as a header so Server Component layouts
// (which don't otherwise have access to it) can make path-specific
// decisions — e.g. the (app) layout letting /pricing render without a
// session instead of redirecting to /login.
export default auth((req) => {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

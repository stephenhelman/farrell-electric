import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logEnvWarningsOnce } from "@/lib/env";

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? "app.farrellelectric.com";
const DEV_APP_HOST = "app.localhost:3000";
const PORTAL_PREFIX = "/app-portal";
const SIGN_IN_PATH = "/sign-in";
const AUTH_API_PREFIX = "/api/auth";
// Task 8: public, tokenized quote-link route — replaces the retired
// Cloudflare Worker. Unauthenticated by design, reachable on either host,
// never rewritten into the auth-gated app-portal namespace.
const PUBLIC_QUOTE_PREFIX = "/q/";

function isAppHost(host: string | null): boolean {
  return host === APP_HOST || host === DEV_APP_HOST;
}

export async function middleware(request: NextRequest) {
  // Runtime-only, soft-validated env check (Task 11) — logs at most once per
  // process, never throws, never runs during `next build`.
  logEnvWarningsOnce();

  const host = request.headers.get("host");
  const onAppHost = isAppHost(host);
  const { pathname } = request.nextUrl;

  // NextAuth's own route handler lives at app/api/auth/[...nextauth] (not
  // under app-portal) and must stay reachable pre-auth — it's how a session
  // gets established in the first place.
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  if (pathname.startsWith(PUBLIC_QUOTE_PREFIX)) {
    return NextResponse.next();
  }

  // The portal segment only exists to give the app surface its own URL
  // namespace to rewrite into — it must never be reachable directly on the
  // marketing host, session or no session.
  if (pathname.startsWith(PORTAL_PREFIX)) {
    if (!onAppHost) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  if (!onAppHost) {
    return NextResponse.next();
  }

  // From here on: on the app host, not the auth API, not already rewritten.
  // The host check alone is not a security boundary — layer the session
  // check on top before rewriting into the portal.
  const isSignInRoute = pathname === SIGN_IN_PATH;

  if (!isSignInRoute) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = SIGN_IN_PATH;
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = `${PORTAL_PREFIX}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|images/).*)"],
};

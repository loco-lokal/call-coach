import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-call-coach-path",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  if (!request.cookies.has("call_coach_session")) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(login);
  }
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ["/scripts/:path*", "/runs/:path*", "/docs/:path*", "/components"],
};

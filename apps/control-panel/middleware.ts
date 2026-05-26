import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "chuckhub_session";
const PUBLIC_PATHS = ["/login", "/signup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // protect everything except api routes, _next assets, and static files
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.svg).*)",
  ],
};

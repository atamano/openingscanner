import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_SET,
  negotiateLocale,
} from "@/lib/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const first = pathname.split("/")[1] ?? "";
  if (LOCALE_SET.has(first)) {
    return NextResponse.next();
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const headerLocale = negotiateLocale(
    request.headers.get("accept-language"),
  );
  const locale =
    cookieLocale && LOCALE_SET.has(cookieLocale) ? cookieLocale : headerLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: [
    // Run on any path except static assets, _next internals, and route-handler
    // metadata files. All metadata routes (sitemap.xml, robots.txt,
    // opengraph-image, twitter-image, icons) produce URLs with a file
    // extension, so the `.*\\..*` exclusion catches them.
    "/((?!_next|api|.*\\..*).*)",
  ],
};

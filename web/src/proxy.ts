import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Proxy — runs on the server before every request.
 *
 * (In Next.js 16, the file previously called "middleware.ts" is now
 * called "proxy.ts". The API is the same — NextRequest/NextResponse
 * work identically. The rename clarifies that this code runs at the
 * network boundary, intercepting and forwarding requests.)
 *
 * Why a proxy instead of checking auth in each page?
 * 1. Runs BEFORE the page even starts rendering — no flash of unauthorized content
 * 2. Centralized logic — one place to manage all route protection
 * 3. Server-side — the redirect happens before any HTML reaches the browser
 *
 * How we detect authentication:
 * We check for an "accessToken" cookie. Since localStorage is
 * browser-only and the proxy runs on the server, we use a cookie
 * for server-side auth checks.
 *
 * The actual token VALIDATION (checking if it's expired or tampered
 * with) happens on the backend. The proxy just checks if a token
 * EXISTS to decide whether to redirect. This is a UX optimization,
 * not a security measure.
 */

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

const AUTH_PATHS = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('accessToken')?.value;
  const isAuthenticated = !!token;

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}?`),
  );

  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}?`),
  );

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

/**
 * matcher: tells Next.js WHICH routes this proxy applies to.
 *
 * We exclude static files (_next, images, favicon) because the proxy
 * doesn't need to check auth for CSS files or images — only pages.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};

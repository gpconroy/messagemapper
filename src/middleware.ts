import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const pathname = req.nextUrl.pathname

  // Public routes
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup")
  const isAuthApi = pathname.startsWith("/api/auth")
  const isMapperRoute = pathname.startsWith("/mapper") // Allow mapper temporarily until Phase 7 Plan 04

  if (isAuthApi || isMapperRoute) {
    return NextResponse.next()
  }

  if (!isAuthenticated && !isAuthPage) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}

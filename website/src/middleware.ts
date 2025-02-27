import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a presentation file request
  if (pathname.startsWith("/api/presentations/")) {
    // No additional processing needed here since we handle everything in the API route
    return NextResponse.next();
  }
  
  // For all other requests, continue normal routing
  return NextResponse.next();
}

export const config = {
  // Middleware applied to specific paths
  matcher: [
    // API routes for presentations
    "/api/presentations/:path*",
  ],
}; 
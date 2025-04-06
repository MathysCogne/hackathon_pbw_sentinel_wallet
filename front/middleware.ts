import { NextRequest, NextResponse } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/transactions',
];

export default async function middleware(request: NextRequest) {
  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // If route is not protected, continue normally
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check if user is authenticated (has a wallet_address cookie)
  const walletAddress = request.cookies.get('wallet_address');

  // If user is not authenticated, redirect to home page
  if (!walletAddress) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // User is authenticated, continue normally
  return NextResponse.next();
}

// Configure matcher for routes where middleware will be executed
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}; 
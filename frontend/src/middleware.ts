import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/register');
  const isVerifyPage = request.nextUrl.pathname.startsWith('/verify-otp');

  // Always allow access to auth pages if not authenticated
  if (!token && isAuthPage) {
    return NextResponse.next();
  }

  // Allow access to verify-otp page without token
  if (!token && !isAuthPage && !isVerifyPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If token exists and user is trying to access auth pages
  if (token && isAuthPage) {
    try {
      // Verify token validity by making a request to the backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, {
        headers: {
          Cookie: `accessToken=${token}`
        }
      });

      if (response.ok) {
        // Token is valid, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // If token verification fails, allow access to auth pages
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/verify-otp',
  ],
}; 
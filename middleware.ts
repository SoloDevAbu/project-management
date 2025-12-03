import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const orgId = req.headers.get('x-org-id');

    if (token && orgId) {
      const response = NextResponse.next();
      response.headers.set('x-org-id', orgId);
      return response;
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        if (path.startsWith('/api/auth')) {
          return true;
        }

        if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/forgot-password')) {
          return !token;
        }

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting (IP -> { count, timestamp })
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;
const MAX_LIVE_TOKEN_REQUESTS = 5;

export function proxy(request: NextRequest) {
  // Only apply to /api routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 1. Origin check (prevent cross-origin calls)
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host && originUrl.hostname !== 'localhost' && originUrl.hostname !== '127.0.0.1') {
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  }

  // 2. CSRF / Custom Header check for state-changing operations and sensitive endpoints
  const method = request.method;
  const isSensitiveGet = request.nextUrl.pathname === '/api/chat/live-token';
  const isExternalWebhook = request.nextUrl.pathname.startsWith('/api/telegram/webhook');
  
  if (!isExternalWebhook && (method === 'POST' || method === 'PUT' || method === 'DELETE' || isSensitiveGet)) {
    const customHeader = request.headers.get('x-bioarc-client');
    if (customHeader !== 'true') {
      return NextResponse.json({ error: 'Forbidden request' }, { status: 403 });
    }
  }

  // 3. Rate limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);

  if (!limitData || (now - limitData.timestamp > WINDOW_MS)) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
  } else {
    limitData.count++;
    const limit = isSensitiveGet ? MAX_LIVE_TOKEN_REQUESTS : MAX_REQUESTS;
    
    if (limitData.count > limit) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

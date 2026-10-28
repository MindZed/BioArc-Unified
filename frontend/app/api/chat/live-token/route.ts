// app/api/chat/live-token/route.ts
// This file will be used to get the live token for the chatbot

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');
    
    if (referer && host) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host !== host && refererUrl.hostname !== 'localhost' && refererUrl.hostname !== '127.0.0.1') {
          return NextResponse.json({ error: 'Forbidden referer' }, { status: 403 });
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid referer' }, { status: 403 });
      }
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Generative AI API key is not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: apiKey });
  } catch (error) {
    console.error('Failed to vend Gemini API key:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving key' },
      { status: 500 }
    );
  }
}

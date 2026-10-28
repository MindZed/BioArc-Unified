// app/api/context/route.ts
// API route to add project context (knowledge base)

import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { keyword, content } = body;

    if (!keyword || !content) {
      return NextResponse.json({ error: 'Keyword and content are required' }, { status: 400 });
    }

    if (typeof keyword !== 'string' || typeof content !== 'string' || keyword.length > 100 || content.length > 5000) {
      return NextResponse.json({ error: 'Invalid input or length limits exceeded' }, { status: 400 });
    }

    await prisma.projectContext.create({
      data: {
        keyword,
        content,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to create context:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

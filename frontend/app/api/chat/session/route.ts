// app/api/chat/session/route.ts
// API route to create, delete, and rename chat sessions. 
// Allows anonymous access for sessions without a userId, but protects authenticated sessions.

import prisma from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

    const newSession = await prisma.chatSession.create({
      data: { title: "New AI Session", userId }
    });
    return NextResponse.json({ session: newSession });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionAuth = await auth();
    const userId = sessionAuth?.user?.id || null;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });

    // If session has an owner, only the owner can delete it
    if (chatSession && chatSession.userId !== null && chatSession.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.chatMessage.deleteMany({
      where: { sessionId: sessionId },
    });

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionAuth = await auth();
    const userId = sessionAuth?.user?.id || null;

    const { sessionId, title } = await req.json();

    if (!sessionId || !title) {
      return NextResponse.json({ error: 'Session ID and title are required' }, { status: 400 });
    }

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });

    // If session has an owner, only the owner can rename it
    if (chatSession && chatSession.userId !== null && chatSession.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: title },
    });

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error('Failed to rename session:', error);
    return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 });
  }
}

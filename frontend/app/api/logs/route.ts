// app\api\logs\route.ts
// This file is for retriveing logs using api calls

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.systemLog.count(),
    ]);

    const formattedLogs = logs.map(l => ({
      id: l.id,
      timestamp: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity: l.level === 'critical' ? 'critical' : l.level === 'warning' ? 'warning' : 'nominal',
      message: l.message,
    }));

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch system logs:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 });
  }
}

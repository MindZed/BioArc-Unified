import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const latestTelemetry = await prisma.telemetry.findFirst({
      orderBy: { timestamp: 'desc' }
    });
    
    if (!latestTelemetry) {
      return NextResponse.json({ error: 'No telemetry found' }, { status: 404 });
    }
    
    return NextResponse.json(latestTelemetry);
  } catch (error) {
    console.error('Failed to fetch latest telemetry:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

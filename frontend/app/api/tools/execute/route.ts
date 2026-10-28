// app/api/tools/execute/route.ts
// This file will be used to execute the tools

import { NextRequest, NextResponse } from 'next/server';
import { getBioarcTools } from '@/lib/ai/tools';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = session?.user?.role || 'USER';
    const toolsInstance = getBioarcTools(userRole);

    const { toolName, args } = await req.json();

    if (!toolName || typeof toolName !== 'string') {
      return NextResponse.json({ error: 'Tool name is required and must be a string' }, { status: 400 });
    }

    const allowedTools = Object.keys(toolsInstance);
    if (!allowedTools.includes(toolName)) {
      return NextResponse.json({ error: `Tool ${toolName} is not allowed` }, { status: 403 });
    }

    const tool = toolsInstance[toolName as keyof typeof toolsInstance];

    try {
      const toolDef = tool as any;
      if (toolDef.parameters && typeof toolDef.parameters.parse === 'function') {
        toolDef.parameters.parse(args);
      }

    } catch (e: any) {
      return NextResponse.json({ error: `Invalid tool arguments: ${e.message}` }, { status: 400 });
    }


    if (!tool || !tool.execute) {
      return NextResponse.json({ error: `Tool ${toolName} not found or not executable` }, { status: 404 });
    }

    // @ts-ignore - The execute signature is internal to the AI SDK but we can call it directly
    const result = await tool.execute(args, { toolCallId: "live-proxy", messages: [] });

    // In case the result is an object or string, JSON stringify it to ensure it's a flat string for Gemini Live
    const stringOutput = typeof result === 'string' ? result : JSON.stringify(result);

    return NextResponse.json({ result: stringOutput });
  } catch (error: any) {
    console.error('Error executing tool proxy:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

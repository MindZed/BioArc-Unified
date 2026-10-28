// app/api/chat/route.ts
// This file will be used to handle the chat requests from the frontend

import { streamText, ModelMessage, isStepCount, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getBioarcTools } from '@/lib/ai/tools';
import { auth } from '@/lib/auth';

interface ChatRequestBody {
  messages: ModelMessage[];
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[SERVER:${requestId}] 🟢 Incoming POST request`);
  console.time(`[SERVER:${requestId}] Total_Request_Time`);
  try {
    const sessionAuth = await auth();
    const userRole = sessionAuth?.user?.role || 'USER';
    const userId = sessionAuth?.user?.id || null;
    
    const body = (await req.json()) as ChatRequestBody;
    const querySessionId = req.nextUrl.searchParams.get('sessionId');
    let { messages, sessionId, fastMode } = body as any;

    if (!messages || !Array.isArray(messages) || messages.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Too many messages or invalid format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const latestMessage = messages[messages.length - 1];
    let latestMessageContent = latestMessage?.content;
    if (latestMessage?.parts) {
      latestMessageContent = latestMessage.parts.map((p: any) => p.text || '').join('');
    }
    if (typeof latestMessageContent === 'string' && latestMessageContent.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message content exceeds maximum allowed length' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Default fastMode to true if it is not explicitly provided
    const isFastMode = fastMode !== false;

    // Fallback to query parameter if body doesn't contain it
    if (!sessionId && querySessionId) {
      sessionId = querySessionId;
    }

    console.log(`[SERVER:${requestId}] Incoming messages:`, JSON.stringify(messages));

    // Sanitize messages to strictly use 'role' and 'content' (strip 'parts' which breaks OpenAI/Groq)
    messages = messages.map((msg: any) => {
      const sanitized = { ...msg };
      if (sanitized.parts && !sanitized.content) {
        sanitized.content = sanitized.parts.map((p: any) => p.text || '').join('');
      }
      delete sanitized.parts;
      return sanitized;
    });

    // Session Safety Check
    if (!sessionId) {
      const newSession = await prisma.chatSession.create({
        data: { title: "New AI Session", userId: userId }
      });
      sessionId = newSession.id;
    } else {
      const existingSession = await prisma.chatSession.findUnique({
        where: { id: sessionId }
      });
      // Allow if user owns it OR if it's an anonymous session being accessed by an anonymous user
      if (!existingSession || existingSession.userId !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
    }

    // Pre-Stream Database Write (User Message)
    let contentString = latestMessageContent || '';

    console.time(`[SERVER:${requestId}] DB_Pre_Save`);
    await prisma.chatMessage.create({
      data: {
        sessionId: sessionId,
        role: 'user',
        content: contentString,
      }
    });
    console.timeEnd(`[SERVER:${requestId}] DB_Pre_Save`);

    const aiProvider = process.env.AI_PROVIDER?.toLowerCase() === 'groq' ? 'groq' : 'google';
    
    let activeModel;
    let modelLogName;
    
    if (aiProvider === 'groq') {
      const groq = createGroq({
        apiKey: process.env.GROQ_API_KEY || '',
      });
      const selectedModel = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
      activeModel = groq(selectedModel);
      modelLogName = `Groq (${selectedModel})`;
    } else {
      const selectedModel = process.env.AI_MODEL || 'gemini-3.1-flash-lite';
      activeModel = google(selectedModel);
      modelLogName = `Google (${selectedModel})`;
    }

    console.log(`[SERVER:${requestId}] 🧠 Calling AI API with model: ${modelLogName}`);

    const result = streamText({
      model: activeModel,
      system: `You are the BioArc Reactor AI. You manage a physical algae bioreactor. You have tools to control hardware, read telemetry, and search the project knowledge base.\n\nSTRICT RULES:\n1. Do not use any tools for simple conversational greetings (e.g., 'hello', 'how are you').\n2. NEVER use toggleActuator or hardware tools unless the user EXPLICITLY asks you to control a device, change mode, or turn something on or off. Note: You can enable/disable manual override mode using 'manual_mode_on' and 'manual_mode_off'. When toggling relays (e.g., light_off), the system automatically engages manual override for you.\n3. Only search the knowledge base when answering specific questions about the BioArc project itself.\n4. Output plain text only for tool execution, do not output raw JSON or <function> tags in your responses.\n5. Use rich markdown formatting (bolding, lists, code blocks, etc.) to make your responses visually appealing and highly structured.\n6. Do NOT use emojis within the body of your text. You may place 1 or 2 highly relevant emojis at the very end of your entire response, but nowhere else.\n7. The current user is logged in with role: ${userRole}. Only ADMIN users can control hardware. If a USER asks to control hardware, politely refuse.\n8. NEVER hallucinate tool executions. You MUST actually invoke the tool to confirm an action.`,
      messages,
      tools: getBioarcTools(userRole),
      stopWhen: isStepCount(5),
      onFinish: async (event: { text: any; }) => {
        try {
          console.log(`[SERVER:${requestId}] 🏁 AI Stream finished. Starting background DB save.`);
          console.time(`[SERVER:${requestId}] DB_Post_Save`);
          await prisma.chatMessage.create({
            data: {
              sessionId: sessionId!,
              role: 'assistant',
              content: event.text,
            }
          });
          console.timeEnd(`[SERVER:${requestId}] DB_Post_Save`);

          // Dynamically summarize first message to create chat title if it's currently default
          const session = await prisma.chatSession.findUnique({
            where: { id: sessionId! },
            select: { title: true }
          });

          if (session && session.title === "New AI Session") {
            // Fire and forget so it doesn't block the UI loading state
            Promise.resolve().then(async () => {
              try {
                const { text: titleText } = await generateText({
                  model: activeModel,
                  prompt: `Generate a short, concise chat session title (maximum 4 words, no punctuation, no quotes) for the following initial user message: "${contentString}"`
                });
                
                const cleanTitle = titleText.trim().replace(/^["']|["']$/g, '');
                
                await prisma.chatSession.update({
                  where: { id: sessionId! },
                  data: { title: cleanTitle }
                });
                console.log(`[SERVER] Generated session title: ${cleanTitle}`);
              } catch (titleError) {
                console.error('Failed to generate dynamic title:', titleError);
              }
            });
          }
          console.timeEnd(`[SERVER:${requestId}] Total_Request_Time`);
        } catch (dbError) {
          console.error('Failed to save AI response to DB:', dbError);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

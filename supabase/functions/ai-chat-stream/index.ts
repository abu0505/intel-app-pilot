// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestSchema = z.object({
      message: z.string().trim().min(1, "Message cannot be empty").max(5000, "Message too long"),
      sessionId: z.string().uuid("Invalid session ID"),
      notebookId: z.string().uuid("Invalid notebook ID").optional(),
      selectedSourceIds: z.array(z.string().uuid()).optional()
    });

    const body = await req.json();
    const { message, sessionId, notebookId, selectedSourceIds } = requestSchema.parse(body);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) throw new Error("Unauthorized");

    // Fetch recent chat history for context
    const { data: recentMessages } = await supabase
      .from("chat_histories")
      .select("message_type, content")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Get user's sources for context (only selected ones if provided)
    let sourcesQuery = supabase
      .from("sources")
      .select("content, source_name")
      .eq("user_id", user.id);

    // Filter by selected sources if provided
    if (selectedSourceIds && selectedSourceIds.length > 0) {
      sourcesQuery = sourcesQuery.in("id", selectedSourceIds);
    } else if (notebookId) {
      // Otherwise filter by notebook_id if provided
      sourcesQuery = sourcesQuery.eq("notebook_id", notebookId);
    }

    sourcesQuery = sourcesQuery.limit(5);

    const { data: sources } = await sourcesQuery;

    const context = (sources ?? [])
      .map((s: { source_name: string | null; content: string | null }) =>
        `Source: ${s.source_name ?? "Untitled"}\n${s.content ?? ""}`,
      )
      .join("\n\n");

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!googleApiKey) {
      throw new Error("Missing Google AI credentials");
    }

    // Build conversation history
    const conversationHistory = (recentMessages || []).map(msg => ({
      role: msg.message_type === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Build the full conversation with system prompt and current message
    const contents = [
      {
        role: "user",
        parts: [{
          text: `You are a helpful study assistant. Use this context to answer questions (if relevant):\n\n${context}\n\nRemember our conversation history and maintain context across messages.`
        }]
      },
      ...conversationHistory,
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    // Use streaming API
    const geminiModel = "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${googleApiKey}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      },
    );

    if (!response.ok) {
      throw new Error("Gemini API request failed");
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullMessage = "";

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                if (jsonStr === "[DONE]") continue;
                
                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  
                  if (text) {
                    fullMessage += text;
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch (e) {
                  console.error("Failed to parse chunk:", e);
                }
              }
            }
          }

          // Save the complete message to database
          await supabase.from("chat_histories").insert({
            user_id: user.id,
            session_id: sessionId,
            message_type: "assistant",
            content: fullMessage,
            notebook_id: notebookId || null,
          });

          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in ai-chat-stream function:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

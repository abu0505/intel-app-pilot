import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, sessionId } = await req.json();
    
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

    // Get user's sources for context
    const { data: sources } = await supabase
      .from("sources")
      .select("content, source_name")
      .eq("user_id", user.id)
      .limit(5);

    const context = sources?.map(s => `Source: ${s.source_name}\n${s.content}`).join("\n\n") || "";

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let assistantMessage: string;

    if (googleApiKey) {
      const geminiModels = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
      ];

      let googleResponse: Response | null = null;
      let googleData: any = null;
      let successful = false;
      let lastError: string | undefined;

      for (const googleModel of geminiModels) {
        googleResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `You are a helpful study assistant. Use this context to answer questions (if relevant):\n\n${context}\n\nQuestion: ${message}`,
                    },
                  ],
                },
              ],
            }),
          },
        );

        googleData = await googleResponse.json();
        if (googleResponse.ok) {
          successful = true;
          break;
        }

        lastError = googleData.error?.message ?? `Gemini request failed for model ${googleModel}`;
      }

      if (!successful || !googleData) {
        throw new Error(lastError ?? "Gemini API request failed");
      }

      assistantMessage = (googleData.candidates?.[0]?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim();
    } else {
      if (!lovableApiKey) {
        throw new Error("Missing AI provider credentials");
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a helpful study assistant. Use this context to answer questions:\n\n${context}` },
            { role: "user", content: message },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Lovable AI request failed");
      }

      assistantMessage = data.choices?.[0]?.message?.content ?? "";
    }

    await supabase.from("chat_histories").insert({
      user_id: user.id,
      session_id: sessionId,
      message_type: "assistant",
      content: assistantMessage,
    });

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-chat edge function error", error);
    const message = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

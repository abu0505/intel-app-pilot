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
      sourceId: z.string().uuid("Invalid source ID"),
      sessionId: z.string().uuid("Invalid session ID")
    });

    const body = await req.json();
    const { sourceId, sessionId } = requestSchema.parse(body);
    
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

    // Get the source content
    const { data: source } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (!source) throw new Error("Source not found");

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) {
      throw new Error("Missing Google AI credentials");
    }

    const geminiModels = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
    ];

    let googleResponse: Response | null = null;
    let googleData: any = null;
    let successful = false;
    let lastError: string | undefined;

    const prompt = `You are a helpful study assistant. Generate a concise, well-structured summary in 2-3 paragraphs highlighting key concepts and main ideas.\n\nTitle: ${source.source_name}\nType: ${source.source_type}\n\nContent:\n${(source.content ?? "").slice(0, 8000)}`;

    for (const model of geminiModels) {
      googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      googleData = await googleResponse.json();
      if (googleResponse.ok) {
        successful = true;
        break;
      }

      lastError = googleData.error?.message ?? `Gemini request failed for model ${model}`;
    }

    if (!successful || !googleData) {
      throw new Error(lastError ?? "Gemini API request failed");
    }

    const summary = (googleData.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim();

    if (!summary) {
      throw new Error("Failed to generate summary");
    }

    // Update source with summary
    await supabase
      .from("sources")
      .update({ ai_summary: summary })
      .eq("id", sourceId);

    // Add summary to chat history
    await supabase.from("chat_histories").insert({
      user_id: user.id,
      session_id: sessionId,
      message_type: "assistant",
      content: `📚 **Summary of "${source.source_name}"**\n\n${summary}`,
      sources_referenced: [sourceId],
    });

    console.log("Summary generated successfully for source:", sourceId);

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "An error occurred generating the summary" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

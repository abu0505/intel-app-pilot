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
      sourceIds: z.array(z.string().uuid()).optional(),
      cardCount: z.number().int().min(1).max(100).default(15),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
      topic: z.string().trim().max(200).optional()
    });

    const body = await req.json();
    const { sourceIds, cardCount, difficulty, topic } = requestSchema.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) throw new Error("Unauthorized");

    let sources;

    if (Array.isArray(sourceIds) && sourceIds.length > 0) {
      const { data: selectedSources, error: selectedError } = await supabase
        .from("sources")
        .select("id, source_name, content")
        .in("id", sourceIds);

      if (selectedError) throw selectedError;
      sources = (selectedSources ?? []) as { id: string; source_name: string | null; content: string | null }[];
    } else {
      const { data: userSources, error: userSourcesError } = await supabase
        .from("sources")
        .select("id, source_name, content")
        .eq("user_id", user.id);

      if (userSourcesError) throw userSourcesError;
      sources = (userSources ?? []) as { id: string; source_name: string | null; content: string | null }[];
    }

    if (!sources || sources.length === 0) {
      throw new Error("No sources found");
    }

    const combinedContent = sources
      .map((s: { source_name: string | null; content: string | null }) => `Source: ${s.source_name ?? "Untitled"}\n${s.content ?? ""}`)
      .join("\n\n");

    const instructions = [`You are an expert at creating educational flashcards. Generate ${cardCount} flashcards from the provided content.`];

    if (topic) {
      instructions.push(`Focus specifically on: ${topic}`);
    }

    instructions.push(`Each flashcard should have:
- front: A concise question or concept (1-10 words)
- back: A clear, complete answer (1-3 sentences)
- difficulty: A number between 0.0 (easy) and 1.0 (hard)
- category: The main topic category

Make the overall set feel ${difficulty} in difficulty.

Return ONLY a valid JSON object with this structure:
{
  "cards": [
    {
      "front": "Question or concept",
      "back": "Answer or explanation",
      "difficulty": 0.5,
      "category": "Topic Name"
    }
  ]
}

Focus on key concepts, definitions, and important facts. Make questions clear and answers comprehensive.`);

    const aiPrompt = `${instructions.join("\n\n")}

Content:
${combinedContent.substring(0, 4000)}`;

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    let aiResponseText: string;

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
                  parts: [{ text: aiPrompt }],
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

      aiResponseText = (googleData.candidates?.[0]?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim();
    } else {
      throw new Error("Missing Google AI credentials");
    }

    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const flashcardData = JSON.parse(jsonMatch[0]);
    
    const title = sources.length === 1 
      ? `Flashcards: ${sources[0].source_name}` 
      : `Flashcards from ${sources.length} sources`;

    const { data: insertedFlashcard, error: insertError } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        source_ids: sourceIds && sourceIds.length > 0 ? sourceIds : sources.map((s) => s.id),
        title,
        card_count: flashcardData.cards.length,
        cards: flashcardData.cards,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ flashcard: insertedFlashcard }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-flashcards function:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "An error occurred generating flashcards" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

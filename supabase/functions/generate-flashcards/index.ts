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
    const {
      sourceIds,
      cardCount = 15,
      difficulty = "medium",
      topic,
    } = await req.json();

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
      sources = selectedSources ?? [];
    } else {
      const { data: userSources, error: userSourcesError } = await supabase
        .from("sources")
        .select("id, source_name, content")
        .eq("user_id", user.id);

      if (userSourcesError) throw userSourcesError;
      sources = userSources ?? [];
    }

    if (!sources || sources.length === 0) {
      throw new Error("No sources found");
    }

    const combinedContent = sources
      .map((s) => `Source: ${s.source_name}\n${s.content}`)
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

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
            {
              role: "system",
              content: instructions.join("\n\n"),
            },
            {
              role: "user",
              content: combinedContent.substring(0, 4000),
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Lovable AI request failed");
      }

      aiResponseText = data.choices?.[0]?.message?.content ?? "";
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

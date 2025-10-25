import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sourceIds, cardCount = 15 } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) throw new Error("Unauthorized");

    const { data: sources } = await supabase
      .from("sources")
      .select("content, source_name")
      .in("id", sourceIds)
      .eq("user_id", user.id);

    if (!sources || sources.length === 0) {
      throw new Error("No sources found");
    }

    const combinedContent = sources.map(s => `Source: ${s.source_name}\n${s.content}`).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating educational flashcards. Generate ${cardCount} flashcards from the provided content.
Each flashcard should have:
- front: A concise question or concept (1-10 words)
- back: A clear, complete answer (1-3 sentences)
- difficulty: A number between 0.0 (easy) and 1.0 (hard)
- category: The main topic category

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

Focus on key concepts, definitions, and important facts. Make questions clear and answers comprehensive.`
          },
          {
            role: "user",
            content: `Generate ${cardCount} flashcards from this content:\n\n${combinedContent.substring(0, 4000)}`
          }
        ],
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");
    
    const flashcardData = JSON.parse(jsonMatch[0]);
    
    const title = sources.length === 1 
      ? `Flashcards: ${sources[0].source_name}` 
      : `Flashcards from ${sources.length} sources`;

    const { data: insertedFlashcard, error: insertError } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        source_ids: sourceIds,
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

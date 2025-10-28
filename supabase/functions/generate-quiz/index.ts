// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { difficulty, questionCount } = await req.json();
    
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
      .select("*")
      .eq("user_id", user.id);

    if (!sources || sources.length === 0) {
      throw new Error("No sources available for quiz generation");
    }

    const content = (sources ?? [])
      .map((s: { content: string | null }) => s.content ?? "")
      .join("\n\n");

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    let questions: unknown;

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
                      text: `Generate ${questionCount} ${difficulty} multiple-choice questions from this content. Return ONLY valid JSON array with format: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]

${content.substring(0, 3000)}`,
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

      const textResponse = (googleData.candidates?.[0]?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim();

      const questionsJson = textResponse.replace(/```json\n?|\n?```/g, "").trim();
      questions = JSON.parse(questionsJson);
    } else {
      throw new Error("Missing Google AI credentials");
    }

    const { data: quiz } = await supabase.from("quizzes").insert({
      user_id: user.id,
      source_ids: sources.map(s => s.id),
      title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz`,
      difficulty_level: difficulty,
      question_count: questionCount,
      questions,
    }).select().single();

    return new Response(JSON.stringify(quiz), {
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

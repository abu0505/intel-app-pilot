import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const content = sources.map(s => s.content).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: `Generate ${questionCount} ${difficulty} multiple-choice questions from this content. Return ONLY valid JSON array with format: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]\n\n${content.substring(0, 3000)}`
        }],
      }),
    });

    const data = await response.json();
    const questionsJson = data.choices[0].message.content.replace(/```json\n?|\n?```/g, "").trim();
    const questions = JSON.parse(questionsJson);

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

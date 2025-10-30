import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceContent, sourceTitle, notebookId } = await req.json();

    if (!notebookId) {
      throw new Error("notebookId is required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');

    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the prompt for Gemini
    const prompt = `Analyze this educational content and generate a concise, descriptive notebook name (3-6 words max).
Also suggest a relevant emoji/icon.

Content Title: ${sourceTitle}
Content Preview: ${sourceContent.substring(0, 2000)}

Return JSON format:
{
  "name": "Subject/Topic Name",
  "icon": "📐"
}

Examples:
- "Linear Algebra Fundamentals" with 📐
- "Biology Chapter 5" with 🧬
- "Organic Chemistry Notes" with ⚗️
- "World War II History" with 📜
- "Python Programming Basics" with 🐍`;

    // Call Gemini API
    const geminiModels = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro"
    ];

    let response = null;
    let lastError = null;

    for (const model of geminiModels) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200,
              },
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error(`${model} error:`, errorText);
          lastError = new Error(`${model} failed: ${errorText}`);
          continue;
        }

        const data = await geminiResponse.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          response = text;
          console.log(`Successfully used ${model}`);
          break;
        }
      } catch (error) {
        console.error(`Error with ${model}:`, error);
        lastError = error;
      }
    }

    if (!response) {
      throw lastError || new Error("All Gemini models failed");
    }

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from response");
    }

    const { name, icon } = JSON.parse(jsonMatch[0]);

    // Update notebook in database
    const { error: updateError } = await supabase
      .from("notebooks")
      .update({ 
        name: name || "Untitled Notebook",
        icon: icon || "📝",
        updated_at: new Date().toISOString()
      })
      .eq("id", notebookId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, name, icon }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-notebook-name:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

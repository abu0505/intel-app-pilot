// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    
    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      throw new Error("Invalid YouTube URL");
    }
    
    const videoId = videoIdMatch[1];
    console.log("Fetching transcript for video:", videoId);

    // Fetch transcript using YouTube's timedtext API
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
    const response = await fetch(transcriptUrl);
    
    if (!response.ok) {
      throw new Error("Transcript not available for this video");
    }

    const xmlText = await response.text();
    
    // Parse XML to extract text
    const textMatches = xmlText.matchAll(/<text[^>]*>([^<]+)<\/text>/g);
    const transcript = Array.from(textMatches)
      .map(match => match[1])
      .map(text => text.replace(/&amp;#39;/g, "'").replace(/&amp;quot;/g, '"').replace(/&amp;/g, "&"))
      .join(" ");

    if (!transcript) {
      throw new Error("No transcript found for this video");
    }

    console.log("Transcript fetched successfully, length:", transcript.length);

    return new Response(
      JSON.stringify({ transcript }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching YouTube transcript:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

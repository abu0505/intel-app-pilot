// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Fetch transcript using multiple strategies with retries
async function fetchTranscript(videoId: string): Promise<string> {
  const strategies = [
    // Strategy 1: YouTube's timedtext API (most reliable)
    async () => {
      try {
        const response = await fetch(
          `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`
        );
        if (response.ok) {
          const xmlText = await response.text();
          const textMatches = xmlText.matchAll(/<text[^>]*>([^<]+)<\/text>/g);
          const transcript = Array.from(textMatches)
            .map(match => match[1])
            .map(text => text
              .replace(/&amp;#39;/g, "'")
              .replace(/&amp;quot;/g, '"')
              .replace(/&amp;/g, "&")
            )
            .join(" ");
          if (transcript) return transcript;
        }
      } catch (e) {
        console.log("Timedtext API failed:", e);
      }
      return null;
    },

    // Strategy 2: Parse from video page HTML
    async () => {
      try {
        return await fetchTranscriptFallback(videoId);
      } catch (e) {
        console.log("Fallback parsing failed:", e);
        return null;
      }
    },

    // Strategy 3: RapidAPI (if key available)
    async () => {
      const rapidKey = Deno.env.get('RAPIDAPI_KEY');
      if (!rapidKey) return null;
      
      try {
        const apiResponse = await fetch(
          `https://youtube-transcript-api.p.rapidapi.com/transcript?video_id=${videoId}`,
          {
            headers: {
              'X-RapidAPI-Key': rapidKey,
              'X-RapidAPI-Host': 'youtube-transcript-api.p.rapidapi.com'
            }
          }
        );

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data.transcript && Array.isArray(data.transcript)) {
            return data.transcript.map((item: any) => item.text).join(' ');
          }
        }
      } catch (e) {
        console.log("RapidAPI failed:", e);
      }
      return null;
    }
  ];

  // Try each strategy with exponential backoff
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          console.log(`Transcript fetched successfully on attempt ${attempt + 1}`);
          return result;
        }
      } catch (e) {
        console.log("Strategy failed, trying next...", e);
      }
    }
    
    // Exponential backoff between attempts
    if (attempt < 1) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw new Error("Unable to fetch transcript after all attempts. This video may not have captions available.");
}

// Fallback method: Fetch transcript directly from YouTube
async function fetchTranscriptFallback(videoId: string): Promise<string> {
  try {
    // Fetch the video page
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const videoPageHtml = await videoPageResponse.text();

    // Extract caption tracks from the page
    const captionTracksMatch = videoPageHtml.match(/"captionTracks":(\[.*?\])/);
    if (!captionTracksMatch) {
      throw new Error("No captions found for this video");
    }

    const captionTracks = JSON.parse(captionTracksMatch[1]);
    if (captionTracks.length === 0) {
      throw new Error("No caption tracks available");
    }

    // Get the first available caption track (usually auto-generated or primary language)
    const captionUrl = captionTracks[0].baseUrl;

    // Fetch the caption XML
    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();

    // Parse XML and extract text
    const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
    let transcript = "";

    for (const match of textMatches) {
      // Decode HTML entities
      const text = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ");
      
      transcript += text + " ";
    }

    if (!transcript.trim()) {
      throw new Error("Failed to extract transcript text");
    }

    return transcript.trim();
  } catch (error) {
    console.error("Fallback transcript fetch failed:", error);
    throw new Error(
      "Unable to fetch transcript. This video may not have captions available."
    );
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, videoUrl } = await req.json();

    if (!videoUrl) {
      throw new Error("Video URL is required");
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    console.log(`Fetching transcript for video ID: ${videoId}`);

    // Fetch the transcript
    const transcript = await fetchTranscript(videoId);

    if (!transcript || transcript.trim().length === 0) {
      throw new Error("Transcript is empty");
    }

    console.log(`Successfully fetched transcript (${transcript.length} characters)`);

    // Update the source record with the transcript
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (sourceId) {
      const { error: updateError } = await supabase
        .from("sources")
        .update({
          content: transcript,
          word_count: transcript.split(/\s+/).length,
        })
        .eq("id", sourceId);

      if (updateError) {
        console.error("Failed to update source:", updateError);
        throw updateError;
      }

      console.log(`Updated source ${sourceId} with transcript`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcript: transcript.substring(0, 500) + "...", // Return preview
        wordCount: transcript.split(/\s+/).length,
        videoId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("fetch-youtube-transcript error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

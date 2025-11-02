import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoverSource {
  type: "website" | "youtube" | "book" | "github";
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  favicon?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, notebookId } = await req.json();

    if (!query || typeof query !== "string") {
      throw new Error("Query is required");
    }

    console.log(`Discovering sources for query: ${query}`);

    const sources: DiscoverSource[] = [];

    // Get API keys from environment
    const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");

    // Parallel API calls for better performance
    const searchPromises: Promise<void>[] = [];

    // 1. Web Search (Brave Search API if available, fallback to basic search)
    if (BRAVE_API_KEY) {
      searchPromises.push(
        (async () => {
          try {
            const response = await fetch(
              `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
              {
                headers: {
                  "Accept": "application/json",
                  "X-Subscription-Token": BRAVE_API_KEY,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.web?.results) {
                data.web.results.forEach((result: any) => {
                  sources.push({
                    type: "website",
                    title: result.title,
                    url: result.url,
                    description: result.description || "",
                    favicon: result.profile?.img || `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=64`,
                  });
                });
              }
            }
          } catch (error) {
            console.error("Brave Search error:", error);
          }
        })()
      );
    }

    // 2. YouTube Search (YouTube Data API)
    if (YOUTUBE_API_KEY) {
      searchPromises.push(
        (async () => {
          try {
            const response = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
            );

            if (response.ok) {
              const data = await response.json();
              if (data.items) {
                data.items.forEach((item: any) => {
                  sources.push({
                    type: "youtube",
                    title: item.snippet.title,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                  });
                });
              }
            }
          } catch (error) {
            console.error("YouTube Search error:", error);
          }
        })()
      );
    }

    // 3. Google Books Search (Free API, no key needed)
    searchPromises.push(
      (async () => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3&printType=books`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.items) {
              data.items.forEach((item: any) => {
                const volumeInfo = item.volumeInfo;
                if (volumeInfo.previewLink || volumeInfo.infoLink) {
                  sources.push({
                    type: "book",
                    title: volumeInfo.title,
                    url: volumeInfo.previewLink || volumeInfo.infoLink,
                    description: volumeInfo.description || `By ${volumeInfo.authors?.join(", ") || "Unknown"}`,
                    thumbnail: volumeInfo.imageLinks?.thumbnail,
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error("Google Books Search error:", error);
        }
      })()
    );

    // 4. GitHub Search (Free API, no key needed)
    searchPromises.push(
      (async () => {
        try {
          const response = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`,
            {
              headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "NexonAI-Discover",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.items) {
              data.items.forEach((item: any) => {
                sources.push({
                  type: "github",
                  title: item.full_name,
                  url: item.html_url,
                  description: item.description || "No description available",
                  favicon: `https://github.com/favicon.ico`,
                });
              });
            }
          }
        } catch (error) {
          console.error("GitHub Search error:", error);
        }
      })()
    );

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    // If no API keys configured, provide helpful fallback
    if (!BRAVE_API_KEY && !YOUTUBE_API_KEY) {
      console.warn("No API keys configured for enhanced search");
      
      // Fallback: Provide some educational resource suggestions
      sources.push({
        type: "website",
        title: `Learn about ${query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(query)}`,
        description: "Free encyclopedia with comprehensive information",
        favicon: "https://www.wikipedia.org/favicon.ico",
      });
    }

    console.log(`Found ${sources.length} sources for: ${query}`);

    return new Response(
      JSON.stringify({ sources }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Discover sources error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to discover sources" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

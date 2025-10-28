// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function extractTextWithOCR(pdfBuffer: Uint8Array): Promise<string> {
  const OCR_API_KEY = Deno.env.get("OCR_SPACE_API_KEY") || "K87899142388957"; // Free tier key
  
  // Convert buffer to base64
  const base64 = btoa(String.fromCharCode(...pdfBuffer));
  
  // Create form data for OCR.space API
  const formData = new FormData();
  formData.append("base64Image", `data:application/pdf;base64,${base64}`);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2"); // Use engine 2 for better accuracy
  
  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      "apikey": OCR_API_KEY,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`OCR API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] || "OCR processing failed");
  }
  
  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    throw new Error("No text extracted from PDF");
  }
  
  // Combine text from all pages
  const extractedText = result.ParsedResults
    .map((page: any) => page.ParsedText || "")
    .join("\n\n")
    .trim();
  
  return extractedText;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, storagePath } = await req.json();

    if (!sourceId || !storagePath) {
      throw new Error("sourceId and storagePath are required");
    }

    console.log(`Processing PDF for source ${sourceId} from storage: ${storagePath}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from("pdf-uploads")
      .download(storagePath);

    if (downloadError) {
      console.error("Failed to download PDF:", downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    // Convert blob to array buffer then to Uint8Array
    const arrayBuffer = await pdfData.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);

    console.log(`PDF downloaded, size: ${pdfBuffer.length} bytes`);

    // Run OCR
    console.log("Running OCR extraction...");
    const extractedText = await extractTextWithOCR(pdfBuffer);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF");
    }

    console.log(`Successfully extracted ${extractedText.length} characters`);

    // Update source with extracted text
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        content: extractedText,
        word_count: extractedText.split(/\s+/).length,
      })
      .eq("id", sourceId);

    if (updateError) {
      console.error("Failed to update source:", updateError);
      throw updateError;
    }

    // Optionally delete the PDF from storage to save space
    await supabase.storage.from("pdf-uploads").remove([storagePath]);

    console.log(`Source ${sourceId} updated successfully with OCR text`);

    return new Response(
      JSON.stringify({
        success: true,
        wordCount: extractedText.split(/\s+/).length,
        preview: extractedText.substring(0, 200) + "...",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("process-pdf-ocr error:", error);
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

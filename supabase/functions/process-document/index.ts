import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple text chunking function
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }
  
  return chunks;
}

// Maximum text size to prevent memory issues (50KB for edge function limits)
const MAX_TEXT_SIZE = 50000;

// Extract text from different file types with strict size limits
function extractText(fileBuffer: ArrayBuffer, fileType: string): string {
  // Only process first 500KB of any file
  const maxSize = 500 * 1024;
  const limitedBuffer = fileBuffer.byteLength > maxSize 
    ? fileBuffer.slice(0, maxSize) 
    : fileBuffer;
  
  const decoder = new TextDecoder("utf-8", { fatal: false });
  
  // For TXT and CSV files, just decode the text
  if (fileType === "text/plain" || fileType === "text/csv" || fileType.includes("csv")) {
    const text = decoder.decode(limitedBuffer);
    return text.slice(0, MAX_TEXT_SIZE);
  }
  
  // For PDF files - simple extraction without regex (memory efficient)
  if (fileType === "application/pdf") {
    const bytes = new Uint8Array(limitedBuffer);
    let result = "";
    
    // Extract printable ASCII only
    for (let i = 0; i < bytes.length && result.length < MAX_TEXT_SIZE; i++) {
      const byte = bytes[i];
      if (byte >= 32 && byte <= 126) {
        result += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) {
        result += " ";
      }
    }
    
    // Clean up the result
    return result.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_SIZE);
  }
  
  // For other types, try to decode as text
  try {
    const text = decoder.decode(limitedBuffer);
    return text.slice(0, MAX_TEXT_SIZE);
  } catch {
    return "";
  }
}

// Background processing function
async function processDocumentInBackground(
  supabaseUrl: string,
  supabaseKey: string,
  documentId: string,
  userId: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get document info
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      console.error("Document not found:", docError);
      return;
    }

    console.log("Processing document:", document.name, document.file_type);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      await supabase
        .from("documents")
        .update({ status: "error" })
        .eq("id", documentId);
      return;
    }

    // Extract text from file
    const fileBuffer = await fileData.arrayBuffer();
    const text = extractText(fileBuffer, document.file_type);
    
    console.log("Extracted text length:", text.length);

    if (text.length === 0) {
      await supabase
        .from("documents")
        .update({ status: "error", chunks_count: 0 })
        .eq("id", documentId);
      return;
    }

    // Chunk the text - limit to 50 chunks max to prevent memory issues  
    let chunks = chunkText(text, 2000, 100);
    if (chunks.length > 50) {
      console.log("Limiting chunks from", chunks.length, "to 50");
      chunks = chunks.slice(0, 50);
    }
    console.log("Created chunks:", chunks.length);

    // Delete existing chunks for this document
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    // Insert chunks in small batches to avoid memory issues
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE).map((content, idx) => ({
        document_id: documentId,
        chunk_index: i + idx,
        content: content.trim(),
      }));
      
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(batch);
      
      if (insertError) {
        console.error("Insert error at batch", i, ":", insertError);
      }
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "processed", chunks_count: chunks.length })
      .eq("id", documentId);

    console.log("Document processed successfully:", documentId);

  } catch (error) {
    console.error("Background processing error:", error);
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase
      .from("documents")
      .update({ status: "error" })
      .eq("id", documentId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, name")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start background processing using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        processDocumentInBackground(supabaseUrl, supabaseKey, documentId, user.id)
      );
    } else {
      // Fallback: process without waiting (fire and forget)
      processDocumentInBackground(supabaseUrl, supabaseKey, documentId, user.id);
    }

    // Return immediately with accepted status
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document processing started",
        documentId: documentId
      }),
      { 
        status: 202, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Error processing document:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

// Maximum text size to prevent memory issues (500KB)
const MAX_TEXT_SIZE = 500000;

// Extract text from different file types with size limits
function extractText(fileBuffer: ArrayBuffer, fileType: string): string {
  const decoder = new TextDecoder("utf-8");
  
  // For TXT and CSV files, just decode the text
  if (fileType === "text/plain" || fileType === "text/csv" || fileType.includes("csv")) {
    const text = decoder.decode(fileBuffer);
    return text.slice(0, MAX_TEXT_SIZE);
  }
  
  // For PDF files, extract basic text with memory-efficient approach
  if (fileType === "application/pdf") {
    // Only process first 2MB of PDF to avoid memory issues
    const maxPdfSize = 2 * 1024 * 1024;
    const limitedBuffer = fileBuffer.byteLength > maxPdfSize 
      ? fileBuffer.slice(0, maxPdfSize) 
      : fileBuffer;
    
    const text = decoder.decode(limitedBuffer);
    const textParts: string[] = [];
    let totalLength = 0;
    
    // Extract text streams from PDF
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null && totalLength < MAX_TEXT_SIZE) {
      const streamContent = match[1];
      const readable = streamContent.replace(/[^\x20-\x7E\r\n]/g, " ").trim();
      if (readable.length > 20 && readable.length < 50000) {
        textParts.push(readable);
        totalLength += readable.length;
      }
    }
    
    if (textParts.length === 0) {
      // Fallback: extract any readable text
      const readable = text.replace(/[^\x20-\x7E\r\n]/g, " ").replace(/\s+/g, " ").trim();
      return readable.slice(0, MAX_TEXT_SIZE);
    }
    
    const result = textParts.join("\n\n");
    return result.slice(0, MAX_TEXT_SIZE);
  }
  
  // For other types, try to decode as text
  try {
    const text = decoder.decode(fileBuffer);
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

    // Chunk the text - limit to 200 chunks max to prevent memory issues
    let chunks = chunkText(text, 1000, 200);
    if (chunks.length > 200) {
      console.log("Limiting chunks from", chunks.length, "to 200");
      chunks = chunks.slice(0, 200);
    }
    console.log("Created chunks:", chunks.length);

    // Delete existing chunks for this document
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    // Insert new chunks in a single batch (faster)
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: content.trim(),
    }));

    // Insert all at once if under 500 chunks, otherwise batch
    if (chunkRecords.length <= 500) {
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(chunkRecords);
      
      if (insertError) {
        console.error("Insert error:", insertError);
      }
    } else {
      // Insert in larger batches of 500
      for (let i = 0; i < chunkRecords.length; i += 500) {
        const batch = chunkRecords.slice(i, i + 500);
        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert(batch);
        
        if (insertError) {
          console.error("Insert error:", insertError);
        }
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

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

// Extract text from different file types
async function extractText(fileBuffer: ArrayBuffer, fileType: string): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  
  // For TXT and CSV files, just decode the text
  if (fileType === "text/plain" || fileType === "text/csv" || fileType.includes("csv")) {
    return decoder.decode(fileBuffer);
  }
  
  // For PDF files, we'll extract basic text (simplified approach)
  if (fileType === "application/pdf") {
    const text = decoder.decode(fileBuffer);
    // Basic PDF text extraction - look for text between stream/endstream
    const textParts: string[] = [];
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null) {
      // Try to extract readable text
      const streamContent = match[1];
      const readable = streamContent.replace(/[^\x20-\x7E\r\n]/g, " ").trim();
      if (readable.length > 10) {
        textParts.push(readable);
      }
    }
    
    if (textParts.length === 0) {
      // Fallback: extract any readable ASCII
      const readable = text.replace(/[^\x20-\x7E\r\n]/g, " ").replace(/\s+/g, " ").trim();
      return readable.slice(0, 50000); // Limit size
    }
    
    return textParts.join("\n\n");
  }
  
  // For other types, try to decode as text
  try {
    return decoder.decode(fileBuffer);
  } catch {
    return "";
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

    // Get document info
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from file
    const fileBuffer = await fileData.arrayBuffer();
    const text = await extractText(fileBuffer, document.file_type);
    
    console.log("Extracted text length:", text.length);

    if (text.length === 0) {
      await supabase
        .from("documents")
        .update({ status: "error", chunks_count: 0 })
        .eq("id", documentId);
      
      return new Response(
        JSON.stringify({ error: "Could not extract text from file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chunk the text
    const chunks = chunkText(text, 1000, 200);
    console.log("Created chunks:", chunks.length);

    // Delete existing chunks for this document
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    // Insert new chunks
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: content.trim(),
    }));

    // Insert in batches of 100
    for (let i = 0; i < chunkRecords.length; i += 100) {
      const batch = chunkRecords.slice(i, i + 100);
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(batch);
      
      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "processed", chunks_count: chunks.length })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCount: chunks.length,
        textLength: text.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

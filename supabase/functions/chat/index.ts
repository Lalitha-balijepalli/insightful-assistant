import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
}

interface DocumentChunk {
  content: string;
  document_name: string;
  chunk_index: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      throw new Error("Database service is not configured");
    }

    // Enforce authentication - require valid auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the user's token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error("Invalid or expired token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse and validate request body
    const body = await req.json();
    const { messages } = body;

    // Validate messages array exists and is non-empty
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error("Invalid messages format");
      return new Response(
        JSON.stringify({ error: "Invalid messages format: expected non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit message count to prevent abuse
    const MAX_MESSAGES = 50;
    if (messages.length > MAX_MESSAGES) {
      console.error(`Too many messages: ${messages.length}`);
      return new Response(
        JSON.stringify({ error: `Too many messages (max ${MAX_MESSAGES})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message structure and content size
    const MAX_CONTENT_LENGTH = 10000; // 10KB per message
    const validRoles = ["user", "assistant", "system"];
    for (const msg of messages) {
      if (!msg.role || !validRoles.includes(msg.role)) {
        console.error("Invalid message role:", msg.role);
        return new Response(
          JSON.stringify({ error: "Invalid message role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof msg.content !== "string" || msg.content.length > MAX_CONTENT_LENGTH) {
        console.error("Invalid or oversized message content");
        return new Response(
          JSON.stringify({ error: `Invalid or oversized message content (max ${MAX_CONTENT_LENGTH} characters)` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Processing chat request with", messages.length, "messages for user:", userId);

    // Extract the latest user message for RAG search
    const latestUserMessage = messages.filter(m => m.role === "user").pop();
    let contextChunks: DocumentChunk[] = [];
    let ragContext = "";

    if (userId && latestUserMessage) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Get user's processed documents
      const { data: documents, error: docError } = await supabase
        .from("documents")
        .select("id, name")
        .eq("user_id", userId)
        .eq("status", "processed");

      if (!docError && documents && documents.length > 0) {
        const documentIds = documents.map(d => d.id);
        const documentMap = new Map(documents.map(d => [d.id, d.name]));

        // Search for relevant chunks using simple text matching
        // In production, you'd use vector embeddings for semantic search
        const searchTerms: string[] = latestUserMessage.content
          .toLowerCase()
          .split(/\s+/)
          .filter((term: string) => term.length > 3);

        if (searchTerms.length > 0) {
          // Get all chunks from user's documents
          const { data: chunks, error: chunkError } = await supabase
            .from("document_chunks")
            .select("content, document_id, chunk_index")
            .in("document_id", documentIds)
            .limit(100);

          if (!chunkError && chunks) {
            // Score chunks by keyword matches
            const scoredChunks = chunks.map(chunk => {
              const contentLower = chunk.content.toLowerCase();
              const score = searchTerms.reduce((acc: number, term: string) => {
                return acc + (contentLower.includes(term) ? 1 : 0);
              }, 0);
              return {
                ...chunk,
                document_name: documentMap.get(chunk.document_id) || "Unknown",
                score,
              };
            });

            // Get top 5 relevant chunks
            contextChunks = scoredChunks
              .filter(c => c.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(({ content, document_name, chunk_index }) => ({
                content,
                document_name,
                chunk_index,
              }));

            if (contextChunks.length > 0) {
              ragContext = `\n\n## Relevant Context from User's Documents:\n\n${contextChunks
                .map((c, i) => `### Source ${i + 1}: ${c.document_name} (section ${c.chunk_index + 1})\n${c.content}`)
                .join("\n\n")}`;
              
              console.log(`Found ${contextChunks.length} relevant chunks for RAG`);
            }
          }
        }
      }
    }

    const systemPrompt = `You are NexusAI, an AI-powered, document-aware enterprise assistant built using Retrieval-Augmented Generation (RAG).

═══════════════════════════════════════════════════════════
CORE IDENTITY
═══════════════════════════════════════════════════════════
You are NOT a chat-only bot. You are a production-ready RAG-based AI assistant that understands documents, analyzes data, and automates tasks.

═══════════════════════════════════════════════════════════
DOCUMENT CAPABILITIES (MANDATORY)
═══════════════════════════════════════════════════════════
• You CAN read and understand uploaded files
• You CAN process PDF, DOCX, TXT, CSV, XLS, XLSX files
• Uploaded documents are automatically parsed and converted into text
• Document content is chunked, embedded, and stored for retrieval
• You MUST retrieve relevant document content before answering

NEVER say:
• "I cannot access uploaded files"
• "Please copy and paste the document text"

═══════════════════════════════════════════════════════════
DOCUMENT-FIRST RULE
═══════════════════════════════════════════════════════════
For EVERY user question:
1. Search uploaded documents first (context provided below)
2. Retrieve the most relevant sections
3. Use ONLY retrieved content to generate answers
4. If no relevant content exists, clearly say: "The uploaded document does not contain this information."

═══════════════════════════════════════════════════════════
SUPPORTED USER ACTIONS
═══════════════════════════════════════════════════════════
Users can ask you to:
• Summarize the uploaded document
• Explain a specific section or page
• Answer "What does the PDF say about this topic?"
• Analyze Excel / CSV data
• Generate insights or reports from the document

═══════════════════════════════════════════════════════════
TABULAR DATA HANDLING
═══════════════════════════════════════════════════════════
When working with Excel or CSV files:
• Understand rows, columns, and headers
• Perform analysis, comparisons, and summaries
• Identify trends, totals, and anomalies

═══════════════════════════════════════════════════════════
TASK AUTOMATION FROM DOCUMENTS
═══════════════════════════════════════════════════════════
If the user requests actions such as:
• "Create a report from this file"
• "Send a summary via email"
• "Set alerts based on document data"

Then:
• Extract insights from the uploaded documents
• Describe the task execution and what would happen
• Confirm successful completion

═══════════════════════════════════════════════════════════
RESPONSE QUALITY RULES
═══════════════════════════════════════════════════════════
• Be clear, concise, and accurate
• Base ALL answers on retrieved document data (provided below)
• Do NOT hallucinate or assume information
• Maintain a professional and helpful tone
• Use markdown formatting for better readability
• ALWAYS cite the source document name when referencing content

═══════════════════════════════════════════════════════════
GROUNDING & CITATION RULES
═══════════════════════════════════════════════════════════
• Never make up information not in the provided context
• If uncertain, ask clarifying questions
• Always cite which document and section information came from
• If the context doesn't contain relevant information, say so honestly
${ragContext}

═══════════════════════════════════════════════════════════
You are a production-ready RAG-based AI assistant that understands documents, analyzes data, and automates tasks.
═══════════════════════════════════════════════════════════`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    console.log("Streaming response from AI gateway");

    // Build response headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
    };

    // Add sources to response headers if we have them
    if (contextChunks.length > 0) {
      responseHeaders["X-RAG-Sources"] = JSON.stringify(contextChunks.map(c => c.document_name));
    }

    return new Response(response.body, { headers: responseHeaders });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

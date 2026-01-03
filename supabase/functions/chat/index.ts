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
    const { messages } = (await req.json()) as ChatRequest;
    
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

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      
      // Verify the user's token
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    console.log("Processing chat request with", messages.length, "messages");

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
        const searchTerms = latestUserMessage.content
          .toLowerCase()
          .split(/\s+/)
          .filter(term => term.length > 3);

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
              const score = searchTerms.reduce((acc, term) => {
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

    const systemPrompt = `You are NexusAI, an intelligent enterprise assistant with the following capabilities:

1. **Information Retrieval**: You can answer questions based on provided context and knowledge. Always cite sources when available.

2. **Task Automation**: You can help users with tasks like:
   - Generating reports (daily, weekly, monthly summaries)
   - Sending notifications and reminders
   - Scheduling meetings and events
   - Data analysis and insights

3. **Intent Detection**: Classify user requests into:
   - Information Query: User wants to know something
   - Task Execution: User wants you to perform an action
   - Decision Support: User needs help making a decision

4. **Response Guidelines**:
   - Be concise but thorough
   - If context from documents is provided, use it to answer and ALWAYS cite the source document name
   - If you don't have information, clearly state "I don't have that information in my knowledge base"
   - For task requests, confirm what action you'll take before executing
   - Always maintain a professional, helpful tone
   - Use markdown formatting for better readability

5. **RAG (Retrieval-Augmented Generation)**:
   - When context is provided below, prioritize information from those sources
   - Always mention which document the information came from
   - If the context doesn't contain relevant information, say so honestly

6. **Grounding**: 
   - Never hallucinate or make up information
   - If uncertain, ask clarifying questions
   - Cite sources when referencing specific data
${ragContext}

Current capabilities are limited to conversational assistance. For actual task execution (emails, scheduling, etc.), you'll simulate the actions and describe what would happen.`;

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

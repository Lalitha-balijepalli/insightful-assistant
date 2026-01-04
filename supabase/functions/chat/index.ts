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

interface DocumentChunk {
  content: string;
  document_name: string;
  chunk_index: number;
}

type IntentType = "information_retrieval" | "task_automation" | "decision_support" | "general";

interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
  description: string;
  suggestedAction?: string;
}

// Classify user intent using AI
async function classifyIntent(
  userMessage: string,
  apiKey: string
): Promise<ClassifiedIntent> {
  console.log("Classifying intent for message:", userMessage.substring(0, 100));

  const classificationPrompt = `Analyze the following user message and classify it into ONE of these categories:

1. INFORMATION_RETRIEVAL - User wants to find, search, or retrieve information from documents/data
   Examples: "What does the document say about...", "Find information on...", "Summarize the PDF"

2. TASK_AUTOMATION - User wants to perform an action or automate a task
   Examples: "Create a report", "Send a notification", "Schedule a reminder", "Generate an export"

3. DECISION_SUPPORT - User wants analysis, recommendations, or help making a decision
   Examples: "Should I...", "Compare these options", "What's the best approach", "Analyze trends"

4. GENERAL - General conversation, greetings, or unclear intent

User message: "${userMessage}"

Respond ONLY with valid JSON in this exact format:
{
  "type": "information_retrieval" | "task_automation" | "decision_support" | "general",
  "confidence": 0.0 to 1.0,
  "description": "brief description of what the user wants",
  "suggestedAction": "optional: specific action to take"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an intent classifier. Respond only with valid JSON." },
          { role: "user", content: classificationPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Intent classification failed:", response.status);
      return { type: "general", confidence: 0.5, description: "Could not classify intent" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("Classified intent:", parsed.type, "confidence:", parsed.confidence);
      return {
        type: parsed.type || "general",
        confidence: parsed.confidence || 0.5,
        description: parsed.description || "",
        suggestedAction: parsed.suggestedAction,
      };
    }
  } catch (error) {
    console.error("Error classifying intent:", error);
  }

  return { type: "general", confidence: 0.5, description: "Default classification" };
}

// Get intent-specific system prompt additions
function getIntentPromptAddition(intent: ClassifiedIntent): string {
  switch (intent.type) {
    case "information_retrieval":
      return `
═══════════════════════════════════════════════════════════
INTENT DETECTED: INFORMATION RETRIEVAL
═══════════════════════════════════════════════════════════
The user is looking for specific information. You MUST:
• Search the provided document context thoroughly
• Cite exact sources and section numbers
• If information is not found, clearly state: "This information was not found in the uploaded documents."
• Provide direct, factual answers without speculation
• Quote relevant passages when helpful
`;

    case "task_automation":
      return `
═══════════════════════════════════════════════════════════
INTENT DETECTED: TASK AUTOMATION
═══════════════════════════════════════════════════════════
The user wants to perform an action. You MUST:
• Acknowledge the requested task clearly
• Describe the steps you would take to complete it
• If the task involves document data, extract the relevant information first
• Confirm what action would be performed and its expected outcome
• If the task cannot be automated, explain what manual steps are needed

Supported automation tasks:
• Generate reports from document data
• Create summaries and exports
• Extract and format specific data
• Identify patterns and anomalies
• Set up monitoring alerts (describe what would be monitored)
`;

    case "decision_support":
      return `
═══════════════════════════════════════════════════════════
INTENT DETECTED: DECISION SUPPORT
═══════════════════════════════════════════════════════════
The user needs analysis or recommendations. You MUST:
• Analyze the available data objectively
• Present multiple perspectives or options when applicable
• Provide evidence-based recommendations
• Highlight key factors affecting the decision
• Acknowledge uncertainties and limitations
• Structure your response with clear pros/cons or criteria

Use frameworks like:
• Comparison tables for multiple options
• Risk/benefit analysis
• Priority ranking with reasoning
`;

    default:
      return "";
  }
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

    // Enforce authentication
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

    if (!Array.isArray(messages) || messages.length === 0) {
      console.error("Invalid messages format");
      return new Response(
        JSON.stringify({ error: "Invalid messages format: expected non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_MESSAGES = 50;
    if (messages.length > MAX_MESSAGES) {
      console.error(`Too many messages: ${messages.length}`);
      return new Response(
        JSON.stringify({ error: `Too many messages (max ${MAX_MESSAGES})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_CONTENT_LENGTH = 10000;
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

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the latest user message
    const latestUserMessage = messages.filter(m => m.role === "user").pop();

    // Load conversation memory: recent messages from past conversations
    let conversationMemory = "";
    try {
      // Get the 3 most recent conversations (excluding current one if identified)
      const { data: recentConversations, error: convError } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(4);

      if (!convError && recentConversations && recentConversations.length > 0) {
        const conversationIds = recentConversations.map(c => c.id);
        
        // Get the last few messages from each recent conversation
        const { data: recentMessages, error: msgError } = await supabase
          .from("messages")
          .select("conversation_id, role, content, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!msgError && recentMessages && recentMessages.length > 0) {
          // Group messages by conversation and create summaries
          const conversationMap = new Map<string, { title: string; messages: Array<{ role: string; content: string }> }>();
          
          for (const conv of recentConversations) {
            conversationMap.set(conv.id, { title: conv.title, messages: [] });
          }
          
          for (const msg of recentMessages) {
            const conv = conversationMap.get(msg.conversation_id);
            if (conv && conv.messages.length < 4) {
              conv.messages.push({ role: msg.role, content: msg.content.substring(0, 200) });
            }
          }

          // Build memory context
          const memoryParts: string[] = [];
          for (const [_, conv] of conversationMap) {
            if (conv.messages.length > 0) {
              const summary = conv.messages
                .reverse()
                .map(m => `${m.role}: ${m.content}${m.content.length >= 200 ? '...' : ''}`)
                .join('\n');
              memoryParts.push(`### ${conv.title}\n${summary}`);
            }
          }

          if (memoryParts.length > 0) {
            conversationMemory = `\n\n## Recent Conversation History:\nHere are summaries of recent conversations with this user:\n\n${memoryParts.slice(0, 3).join('\n\n')}`;
            console.log(`Loaded memory from ${memoryParts.length} recent conversations`);
          }
        }
      }
    } catch (memoryError) {
      console.error("Error loading conversation memory:", memoryError);
      // Continue without memory - non-fatal
    }
    
    // Classify intent for the latest message
    let classifiedIntent: ClassifiedIntent = { type: "general", confidence: 0.5, description: "" };
    if (latestUserMessage) {
      classifiedIntent = await classifyIntent(latestUserMessage.content, LOVABLE_API_KEY);
    }

    // RAG: Search for relevant document context
    let contextChunks: DocumentChunk[] = [];
    let ragContext = "";

    if (userId && latestUserMessage) {
      
      const { data: documents, error: docError } = await supabase
        .from("documents")
        .select("id, name")
        .eq("user_id", userId)
        .eq("status", "processed");

      if (!docError && documents && documents.length > 0) {
        const documentIds = documents.map(d => d.id);
        const documentMap = new Map(documents.map(d => [d.id, d.name]));

        const searchTerms: string[] = latestUserMessage.content
          .toLowerCase()
          .split(/\s+/)
          .filter((term: string) => term.length > 3);

        if (searchTerms.length > 0) {
          const { data: chunks, error: chunkError } = await supabase
            .from("document_chunks")
            .select("content, document_id, chunk_index")
            .in("document_id", documentIds)
            .limit(100);

          if (!chunkError && chunks) {
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

    // Build the system prompt with intent-specific additions
    const intentPromptAddition = getIntentPromptAddition(classifiedIntent);

    const systemPrompt = `You are NexusAI, an AI-powered, document-aware enterprise assistant built using Retrieval-Augmented Generation (RAG).

═══════════════════════════════════════════════════════════
CORE IDENTITY
═══════════════════════════════════════════════════════════
You are NOT a chat-only bot. You are a production-ready RAG-based AI assistant that understands documents, analyzes data, and automates tasks.
${intentPromptAddition}
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

═══════════════════════════════════════════════════════════
CONVERSATION MEMORY
═══════════════════════════════════════════════════════════
You have access to the user's recent conversation history. Use this to:
• Reference previous discussions when relevant
• Maintain continuity across conversations
• Recall user preferences and past requests
• Avoid asking for information already shared
${conversationMemory}
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

    console.log("Streaming response from AI gateway, intent:", classifiedIntent.type);

    // Build response headers with intent and sources
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "X-Intent-Type": classifiedIntent.type,
      "X-Intent-Confidence": String(classifiedIntent.confidence),
    };

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

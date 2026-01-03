import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = (await req.json()) as ChatRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log("Processing chat request with", messages.length, "messages");

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
   - If you don't have information, clearly state "I don't have that information in my knowledge base"
   - For task requests, confirm what action you'll take before executing
   - Always maintain a professional, helpful tone
   - Use markdown formatting for better readability

5. **Grounding**: 
   - Never hallucinate or make up information
   - If uncertain, ask clarifying questions
   - Cite sources when referencing specific data

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

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
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

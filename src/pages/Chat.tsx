import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Plus,
  FileText,
  Settings,
  Sparkles,
  Upload,
  Search,
  ChevronLeft,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  LogOut,
  Trash2,
  FileSearch,
  Zap,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type IntentType = "information_retrieval" | "task_automation" | "decision_support" | "general";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
  feedback?: "positive" | "negative" | null;
  intentType?: IntentType;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: Date;
}

// Intent badge configuration
const intentConfig: Record<IntentType, { label: string; icon: React.ElementType; className: string }> = {
  information_retrieval: {
    label: "Retrieval",
    icon: FileSearch,
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  task_automation: {
    label: "Automation",
    icon: Zap,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  decision_support: {
    label: "Decision",
    icon: Lightbulb,
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  general: {
    label: "General",
    icon: MessageSquare,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const Chat = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content:
      "Hello! I'm NexusAI, your intelligent assistant. I can help you with:\n\n• **Retrieving information** from your documents and knowledge base\n• **Automating tasks** like generating reports and sending notifications\n• **Answering questions** with accurate, sourced responses\n\nHow can I help you today?",
    timestamp: new Date(),
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    setConversations(
      data.map((c) => ({
        id: c.id,
        title: c.title,
        updated_at: new Date(c.updated_at),
      }))
    );
  }, [user]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at, sources, feedback")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    const loadedMessages: Message[] = data.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: new Date(m.created_at),
      sources: m.sources as string[] | undefined,
      feedback: m.feedback as "positive" | "negative" | null,
    }));

    setMessages(loadedMessages.length > 0 ? loadedMessages : [welcomeMessage]);
  }, []);

  // Save feedback for a message
  const saveFeedback = async (messageId: string, feedback: "positive" | "negative") => {
    const { error } = await supabase
      .from("messages")
      .update({ feedback })
      .eq("id", messageId);

    if (error) {
      console.error("Error saving feedback:", error);
      toast.error("Failed to save feedback");
      return;
    }

    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, feedback } : m))
    );
    toast.success("Feedback saved");
  };

  // Create new conversation
  const createConversation = async (): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      return null;
    }

    await loadConversations();
    return data.id;
  };

  // Save message to database
  const saveMessage = async (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    sources?: string[]
  ): Promise<string | null> => {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        sources: sources || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving message:", error);
      return null;
    }

    return data.id;
  };

  // Update conversation title based on first message
  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    
    await supabase
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    await loadConversations();
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
      return;
    }

    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([welcomeMessage]);
    }

    await loadConversations();
    toast.success("Conversation deleted");
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Initialize with welcome message when no conversation selected
  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      setMessages([welcomeMessage]);
    }
  }, [currentConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessage: string, conversationId: string) => {
    setIsLoading(true);
    
    const allMessages = messages
      .filter(m => m.id !== "welcome")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    allMessages.push({ role: "user", content: userMessage });

    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Capture intent from response headers
      const intentType = response.headers.get("X-Intent-Type") as IntentType || "general";
      console.log("Intent detected:", intentType);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = Date.now().toString();

      // Add empty assistant message with intent
      setMessages(prev => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          intentType,
        },
      ]);

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (assistantContent) {
        const savedId = await saveMessage(conversationId, "assistant", assistantContent);
        if (savedId) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, id: savedId } : m
            )
          );
        }
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      await loadConversations();
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setMessages(prev => prev.filter(m => m.content !== ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    let convId = currentConversationId;
    const isFirstMessage = !convId || messages.filter(m => m.id !== "welcome").length === 0;

    // Create conversation if needed
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
      setCurrentConversationId(convId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    // Remove welcome message and add user message
    setMessages(prev => [...prev.filter(m => m.id !== "welcome"), userMessage]);
    const messageContent = inputValue;
    setInputValue("");

    // Save user message
    const savedId = await saveMessage(convId, "user", messageContent);
    if (savedId) {
      setMessages(prev =>
        prev.map(m => (m.id === userMessage.id ? { ...m, id: savedId } : m))
      );
    }

    // Update title on first message
    if (isFirstMessage) {
      await updateConversationTitle(convId, messageContent);
    }

    await streamChat(messageContent, convId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([welcomeMessage]);
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    await loadMessages(conversation.id);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">NexusAI</span>
          </Link>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleNewChat}>
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent transition-colors ${
                    currentConversationId === conversation.id ? "bg-sidebar-accent" : ""
                  }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conversation.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {conversation.updated_at.toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2" asChild>
            <Link to="/documents">
              <FileText className="w-4 h-4" />
              Knowledge Base
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" asChild>
            <Link to="/admin">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronLeft
                className={`w-5 h-5 transition-transform ${
                  !sidebarOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
            <div>
              <h1 className="font-semibold">Chat with NexusAI</h1>
              <p className="text-xs text-muted-foreground">
                RAG-powered • Task automation enabled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                } animate-slide-up`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === "assistant"
                      ? "bg-gradient-primary"
                      : "bg-secondary"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <span className="text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div
                  className={`flex-1 ${
                    message.role === "user" ? "text-right" : ""
                  }`}
                >
                  {/* Intent Badge for assistant messages */}
                  {message.role === "assistant" && message.intentType && message.id !== "welcome" && (
                    <div className="mb-2">
                      {(() => {
                        const config = intentConfig[message.intentType];
                        const IconComponent = config.icon;
                        return (
                          <Badge 
                            variant="outline" 
                            className={`text-xs gap-1 ${config.className}`}
                          >
                            <IconComponent className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  )}
                  <div
                    className={`inline-block p-4 rounded-2xl max-w-full ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap text-left">
                      {message.content || (
                        <span className="text-muted-foreground italic">Thinking...</span>
                      )}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">
                          Sources:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded-md bg-secondary/50"
                            >
                              📄 {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === "assistant" && message.content && message.id !== "welcome" && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        toast.success("Copied to clipboard");
                      }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-7 px-2 ${message.feedback === "positive" ? "text-green-500" : ""}`}
                        onClick={() => saveFeedback(message.id, "positive")}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-7 px-2 ${message.feedback === "negative" ? "text-destructive" : ""}`}
                        onClick={() => saveFeedback(message.id, "negative")}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="inline-block p-4 rounded-2xl rounded-tl-sm bg-card border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <div
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border focus-within:border-primary/50 transition-colors">
                <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                  <Link to="/documents">
                    <Upload className="w-5 h-5" />
                  </Link>
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask anything or request a task..."
                  className="flex-1 border-0 focus-visible:ring-0 bg-transparent"
                  disabled={isLoading}
                />
                <Button
                  variant="hero"
                  size="icon"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                NexusAI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;

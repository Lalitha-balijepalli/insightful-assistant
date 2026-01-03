import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Plus,
  FileText,
  Settings,
  MessageSquare,
  Sparkles,
  Upload,
  Search,
  ChevronLeft,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    title: "Weekly Sales Report",
    lastMessage: "Report generated and sent...",
    timestamp: new Date(),
  },
  {
    id: "2",
    title: "Q4 Performance Analysis",
    lastMessage: "Based on the data...",
    timestamp: new Date(Date.now() - 86400000),
  },
  {
    id: "3",
    title: "Task Scheduling Setup",
    lastMessage: "I've scheduled the meeting...",
    timestamp: new Date(Date.now() - 172800000),
  },
];

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm NexusAI, your intelligent assistant. I can help you with:\n\n• **Retrieving information** from your documents and knowledge base\n• **Automating tasks** like generating reports and sending notifications\n• **Answering questions** with accurate, sourced responses\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I understand you're asking about that topic. Let me search through your knowledge base to find the most relevant information.\n\nBased on the documents I've analyzed, here's what I found:\n\n**Key Findings:**\n1. The data indicates positive trends in the specified area\n2. Historical patterns suggest continued growth\n3. Action items have been identified for follow-up\n\nWould you like me to generate a detailed report or take any automated actions based on these findings?",
        timestamp: new Date(),
        sources: ["Sales Report Q4 2024.pdf", "Performance Metrics.xlsx"],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-background dark">
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
          <Button variant="outline" className="w-full justify-start gap-2">
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
              className="pl-9 bg-sidebar-accent border-sidebar-border"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {mockConversations.map((conv) => (
              <button
                key={conv.id}
                className="w-full p-3 rounded-lg text-left hover:bg-sidebar-accent transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate text-sm">{conv.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {conv.lastMessage}
                </p>
              </button>
            ))}
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
              <h1 className="font-semibold">New Conversation</h1>
              <p className="text-xs text-muted-foreground">
                RAG-powered • Task automation enabled
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
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
                    <span className="text-sm font-medium">U</span>
                  )}
                </div>
                <div
                  className={`flex-1 ${
                    message.role === "user" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block p-4 rounded-2xl max-w-full ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap text-left">
                      {message.content}
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
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
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
            {isLoading && (
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
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Upload className="w-5 h-5" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask anything or request a task..."
                  className="flex-1 border-0 focus-visible:ring-0 bg-transparent"
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

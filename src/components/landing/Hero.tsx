import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Zap } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 mb-8 animate-slide-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Enterprise-Grade RAG-Powered AI</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Intelligent Conversations,{" "}
            <span className="text-gradient">Automated Actions</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Experience the next generation of AI assistants. Context-aware responses, 
            task automation, and seamless integrations—all powered by retrieval-augmented generation.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/chat" className="gap-2">
                Start Chatting <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <Link to="/demo">Watch Demo</Link>
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-16 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/30 backdrop-blur-sm border border-border/30">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm">RAG-Powered</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/30 backdrop-blur-sm border border-border/30">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm">Task Automation</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/30 backdrop-blur-sm border border-border/30">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm">Multi-Agent AI</span>
            </div>
          </div>
        </div>

        {/* Chat Preview Card */}
        <div className="max-w-3xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: "0.5s" }}>
          <div className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-elevated overflow-hidden">
            {/* Window Controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/30">
              <div className="w-3 h-3 rounded-full bg-destructive/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-4 text-sm text-muted-foreground">NexusAI Chat</span>
            </div>

            {/* Chat Messages */}
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-medium">U</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm bg-secondary/50 rounded-lg rounded-tl-none px-4 py-2 inline-block">
                    Generate a weekly sales report and email it to the team
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm bg-primary/10 rounded-lg rounded-tl-none px-4 py-2 inline-block">
                    I'll generate the weekly sales report now. Based on the data from your CRM, 
                    I found 47 closed deals totaling $234,500. Report generated and sent to 
                    <span className="text-primary"> team@company.com</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

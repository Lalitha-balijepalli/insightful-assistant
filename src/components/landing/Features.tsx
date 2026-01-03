import { 
  Brain, 
  MessageSquare, 
  Workflow, 
  Shield, 
  Database, 
  Zap,
  FileSearch,
  Bot
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "RAG-Powered Intelligence",
    description: "Retrieval-augmented generation ensures accurate, grounded responses from your private data sources."
  },
  {
    icon: MessageSquare,
    title: "Context-Aware Conversations",
    description: "Maintains conversation history and user context for personalized, coherent interactions."
  },
  {
    icon: Workflow,
    title: "Task Automation",
    description: "Execute real-world tasks through natural language—reports, notifications, scheduling, and more."
  },
  {
    icon: FileSearch,
    title: "Document Intelligence",
    description: "Upload PDFs, CSVs, Excel files and query your knowledge base with semantic search."
  },
  {
    icon: Bot,
    title: "Multi-Agent Architecture",
    description: "Specialized agents for retrieval, reasoning, automation, and monitoring work together seamlessly."
  },
  {
    icon: Database,
    title: "Enterprise Integration",
    description: "Connect to email, calendars, APIs, and internal databases with secure API handling."
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Granular permissions with user and admin roles, data isolation, and audit logging."
  },
  {
    icon: Zap,
    title: "Continuous Learning",
    description: "Feedback-driven improvements adapt the system to your needs over time."
  }
];

export const Features = () => {
  return (
    <section className="py-24 bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need for{" "}
            <span className="text-gradient">Intelligent Automation</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for enterprises that demand accuracy, security, and seamless task execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-card"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

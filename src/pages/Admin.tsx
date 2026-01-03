import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Users,
  FileText,
  Activity,
  Settings,
  LayoutDashboard,
  Search,
  Bell,
  ChevronDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Database,
  Workflow,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: FileText, label: "Knowledge Base", href: "/admin/documents" },
  { icon: Workflow, label: "Automations", href: "/admin/automations" },
  { icon: Activity, label: "Analytics", href: "/admin/analytics" },
  { icon: Shield, label: "Security", href: "/admin/security" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const stats = [
  { label: "Total Users", value: "1,247", change: "+12%", icon: Users },
  { label: "Documents", value: "3,489", change: "+8%", icon: FileText },
  { label: "Tasks Executed", value: "12,847", change: "+24%", icon: CheckCircle2 },
  { label: "Avg Response Time", value: "1.2s", change: "-15%", icon: Clock },
];

const recentActivity = [
  { user: "John D.", action: "Uploaded sales_report_q4.pdf", time: "2 min ago", type: "upload" },
  { user: "Sarah M.", action: "Generated weekly summary", time: "15 min ago", type: "task" },
  { user: "Mike R.", action: "Updated API credentials", time: "1 hour ago", type: "settings" },
  { user: "Emily K.", action: "Created new automation rule", time: "2 hours ago", type: "automation" },
  { user: "Admin", action: "System backup completed", time: "3 hours ago", type: "system" },
];

const Admin = () => {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">NexusAI Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 p-3">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setActiveMenu(item.label)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeMenu === item.label
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">admin@company.com</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/chat">Open Chat</Link>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Welcome */}
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Monitor and manage your AI assistant</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <Card key={idx} className="bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-500">{stat.change}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <stat.icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest actions across your platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === "upload" ? "bg-blue-500/10 text-blue-500" :
                          activity.type === "task" ? "bg-green-500/10 text-green-500" :
                          activity.type === "automation" ? "bg-purple-500/10 text-purple-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {activity.type === "upload" && <Upload className="w-4 h-4" />}
                          {activity.type === "task" && <CheckCircle2 className="w-4 h-4" />}
                          {activity.type === "automation" && <Workflow className="w-4 h-4" />}
                          {activity.type === "settings" && <Settings className="w-4 h-4" />}
                          {activity.type === "system" && <Database className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.user}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.action}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Documents
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Users className="w-4 h-4" />
                    Invite Users
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Workflow className="w-4 h-4" />
                    Create Automation
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Database className="w-4 h-4" />
                    Sync Knowledge Base
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>All systems operational</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { name: "RAG Pipeline", status: "operational" },
                    { name: "Task Engine", status: "operational" },
                    { name: "API Gateway", status: "operational" },
                    { name: "Vector Database", status: "operational" },
                  ].map((system, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{system.name}</p>
                        <p className="text-xs text-green-500 capitalize">{system.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default Admin;

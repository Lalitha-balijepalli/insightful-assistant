import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation, Navigate } from "react-router-dom";
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
  Workflow,
  Shield,
  Loader2,
} from "lucide-react";

import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminDocuments from "./admin/AdminDocuments";
import AdminAutomations from "./admin/AdminAutomations";
import AdminAnalytics from "./admin/AdminAnalytics";
import AdminSecurity from "./admin/AdminSecurity";
import AdminSettings from "./admin/AdminSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: FileText, label: "Knowledge Base", href: "/admin/documents" },
  { icon: Workflow, label: "Automations", href: "/admin/automations" },
  { icon: Activity, label: "Analytics", href: "/admin/analytics" },
  { icon: Shield, label: "Security", href: "/admin/security" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const Admin = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Check if user has admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setHasAdminRole(false);
        setRoleLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setHasAdminRole(false);
        } else {
          setHasAdminRole(!!data);
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
        setHasAdminRole(false);
      } finally {
        setRoleLoading(false);
      }
    };

    checkAdminRole();
  }, [user]);

  // Update active menu based on current route
  useEffect(() => {
    const currentItem = menuItems.find(item => {
      if (item.href === "/admin") {
        return location.pathname === "/admin";
      }
      return location.pathname.startsWith(item.href);
    });
    if (currentItem) {
      setActiveMenu(currentItem.label);
    }
  }, [location.pathname]);

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect non-admin users to chat
  if (!user || !hasAdminRole) {
    return <Navigate to="/chat" replace />;
  }

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
              <span className="text-sm font-medium text-primary-foreground">
                {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "admin@company.com"}
              </p>
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

        {/* Routed Content */}
        <ScrollArea className="flex-1">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="automations" element={<AdminAutomations />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </ScrollArea>
      </main>
    </div>
  );
};

export default Admin;

import { Workflow, Plus, MoreHorizontal, Play, Pause, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const automations = [
  { id: 1, name: "Daily Report Summary", trigger: "Schedule: 9:00 AM", action: "Generate & Email", status: "Active", lastRun: "Today, 9:00 AM", runs: 127 },
  { id: 2, name: "New Document Alert", trigger: "Document Upload", action: "Slack Notification", status: "Active", lastRun: "2 hours ago", runs: 45 },
  { id: 3, name: "Weekly Analytics", trigger: "Schedule: Monday 8:00 AM", action: "Generate Dashboard", status: "Active", lastRun: "3 days ago", runs: 12 },
  { id: 4, name: "Customer Query Response", trigger: "Email Received", action: "Auto-Reply with AI", status: "Paused", lastRun: "1 week ago", runs: 234 },
];

const AdminAutomations = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">Configure automated workflows and triggers</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Automation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{automations.length}</p>
                <p className="text-sm text-muted-foreground">Total Automations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{automations.filter(a => a.status === "Active").length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">418</p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {automations.map((automation) => (
          <Card key={automation.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${automation.status === "Active" ? "bg-primary/10" : "bg-muted"}`}>
                    <Workflow className={`w-6 h-6 ${automation.status === "Active" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{automation.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{automation.trigger}</span>
                      <span>→</span>
                      <span>{automation.action}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{automation.runs} runs</p>
                    <p className="text-xs text-muted-foreground">Last: {automation.lastRun}</p>
                  </div>
                  <Switch checked={automation.status === "Active"} />
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminAutomations;

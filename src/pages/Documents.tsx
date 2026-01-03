import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Upload,
  Search,
  FileText,
  File,
  FileSpreadsheet,
  Trash2,
  MoreVertical,
  FolderOpen,
  Grid,
  List,
  Filter,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "csv" | "xlsx" | "txt";
  size: string;
  uploadedAt: Date;
  status: "processed" | "processing" | "error";
  chunks: number;
}

const mockDocuments: Document[] = [
  { id: "1", name: "Q4 Sales Report 2024.pdf", type: "pdf", size: "2.4 MB", uploadedAt: new Date(), status: "processed", chunks: 156 },
  { id: "2", name: "Customer Database.csv", type: "csv", size: "1.8 MB", uploadedAt: new Date(Date.now() - 86400000), status: "processed", chunks: 342 },
  { id: "3", name: "Product Catalog.xlsx", type: "xlsx", size: "4.2 MB", uploadedAt: new Date(Date.now() - 172800000), status: "processing", chunks: 0 },
  { id: "4", name: "Company Policies.pdf", type: "pdf", size: "890 KB", uploadedAt: new Date(Date.now() - 259200000), status: "processed", chunks: 89 },
  { id: "5", name: "Meeting Notes.txt", type: "txt", size: "45 KB", uploadedAt: new Date(Date.now() - 345600000), status: "processed", chunks: 12 },
  { id: "6", name: "Financial Analysis.pdf", type: "pdf", size: "3.1 MB", uploadedAt: new Date(Date.now() - 432000000), status: "error", chunks: 0 },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf": return FileText;
    case "csv": return FileSpreadsheet;
    case "xlsx": return FileSpreadsheet;
    default: return File;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "processed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "processing": return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    case "error": return <AlertCircle className="w-4 h-4 text-destructive" />;
    default: return null;
  }
};

const Documents = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const filteredDocs = mockDocuments.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: Handle file upload
    console.log("Files dropped:", e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/chat">
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">Knowledge Base</span>
              </div>
            </div>
            <Button variant="hero" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Files
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-8 ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Drag and drop files here
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Supports PDF, CSV, Excel, and TXT files up to 50MB
          </p>
          <Button variant="outline">Browse Files</Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockDocuments.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockDocuments.filter(d => d.status === "processed").length}</p>
                <p className="text-sm text-muted-foreground">Processed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockDocuments.filter(d => d.status === "processing").length}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockDocuments.reduce((acc, d) => acc + d.chunks, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Chunks</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocs.map((doc) => {
              const FileIcon = getFileIcon(doc.type);
              return (
                <Card key={doc.id} className="group hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        doc.type === "pdf" ? "bg-red-500/10 text-red-500" :
                        doc.type === "csv" || doc.type === "xlsx" ? "bg-green-500/10 text-green-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                    <h3 className="font-medium truncate mb-1">{doc.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{doc.size}</span>
                      {getStatusIcon(doc.status)}
                    </div>
                    {doc.status === "processed" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {doc.chunks} chunks indexed
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredDocs.map((doc) => {
                  const FileIcon = getFileIcon(doc.type);
                  return (
                    <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        doc.type === "pdf" ? "bg-red-500/10 text-red-500" :
                        doc.type === "csv" || doc.type === "xlsx" ? "bg-green-500/10 text-green-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.size} • {doc.chunks} chunks
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusIcon(doc.status)}
                        <span className="text-sm text-muted-foreground">
                          {doc.uploadedAt.toLocaleDateString()}
                        </span>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Documents;

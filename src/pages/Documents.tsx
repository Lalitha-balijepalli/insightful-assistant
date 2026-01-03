import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDocuments, type Document } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

const getFileIcon = (type: string) => {
  if (type.includes("pdf")) return FileText;
  if (type.includes("csv") || type.includes("spreadsheet") || type.includes("excel")) return FileSpreadsheet;
  return File;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "processed":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "processing":
      return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    default:
      return null;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Documents = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    documents,
    isLoading,
    uploadFiles,
    uploadProgress,
    isUploading,
    deleteDocument,
    isDeleting,
    reprocessDocument,
    isReprocessing,
  } = useDocuments();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stats = {
    total: documents.length,
    processed: documents.filter((d) => d.status === "processed").length,
    processing: documents.filter((d) => d.status === "processing").length,
    totalChunks: documents.reduce((acc, d) => acc + (d.chunks_count || 0), 0),
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
            <Button
              variant="hero"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.txt,.csv,.xlsx,.xls"
              onChange={handleFileSelect}
            />
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
            {isDragging ? "Drop files here" : "Drag and drop files here"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Supports PDF, CSV, Excel, and TXT files up to 50MB
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </Button>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mb-6 space-y-2">
            {Object.entries(uploadProgress).map(([name, progress]) => (
              <div key={name} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="flex-1 text-sm truncate">{name}</span>
                <Progress value={progress} className="w-32" />
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
            ))}
          </div>
        )}

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
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold">{stats.processed}</p>
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
                <p className="text-2xl font-bold">{stats.processing}</p>
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
                <p className="text-2xl font-bold">{stats.totalChunks}</p>
                <p className="text-sm text-muted-foreground">Total Chunks</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && documents.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload documents to build your knowledge base for AI-powered chat.
            </p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Document
            </Button>
          </div>
        )}

        {/* Documents Grid/List */}
        {!isLoading && filteredDocs.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocs.map((doc) => {
              const FileIcon = getFileIcon(doc.file_type);
              return (
                <Card
                  key={doc.id}
                  className="group hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          doc.file_type.includes("pdf")
                            ? "bg-red-500/10 text-red-500"
                            : doc.file_type.includes("csv") || doc.file_type.includes("spreadsheet")
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {doc.status === "error" && (
                            <DropdownMenuItem
                              onClick={() => reprocessDocument(doc.id)}
                              disabled={isReprocessing}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Retry Processing
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteDocument(doc.id)}
                            disabled={isDeleting}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-medium truncate mb-1">{doc.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </span>
                      {getStatusIcon(doc.status)}
                    </div>
                    {doc.status === "processed" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {doc.chunks_count || 0} chunks indexed
                      </p>
                    )}
                    {doc.status === "error" && (
                      <p className="text-xs text-destructive mt-2">
                        Processing failed - click to retry
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && filteredDocs.length > 0 && viewMode === "list" && (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredDocs.map((doc) => {
                  const FileIcon = getFileIcon(doc.file_type);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.file_type.includes("pdf")
                            ? "bg-red-500/10 text-red-500"
                            : doc.file_type.includes("csv") || doc.file_type.includes("spreadsheet")
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)} • {doc.chunks_count || 0} chunks
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusIcon(doc.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.status === "error" && (
                              <DropdownMenuItem
                                onClick={() => reprocessDocument(doc.id)}
                                disabled={isReprocessing}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retry Processing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteDocument(doc.id)}
                              disabled={isDeleting}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

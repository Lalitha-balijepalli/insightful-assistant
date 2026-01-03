import { FileText, Search, Upload, MoreHorizontal, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const documents = [
  { id: 1, name: "Sales Report Q4.pdf", type: "PDF", size: "2.4 MB", status: "Processed", chunks: 45, uploadedAt: "2 hours ago" },
  { id: 2, name: "Product Catalog 2024.docx", type: "DOCX", size: "5.1 MB", status: "Processed", chunks: 128, uploadedAt: "1 day ago" },
  { id: 3, name: "Training Manual.pdf", type: "PDF", size: "8.3 MB", status: "Processing", chunks: 0, uploadedAt: "5 min ago" },
  { id: 4, name: "HR Policies.pdf", type: "PDF", size: "1.2 MB", status: "Processed", chunks: 32, uploadedAt: "3 days ago" },
  { id: 5, name: "Technical Specs.xlsx", type: "XLSX", size: "756 KB", status: "Processed", chunks: 18, uploadedAt: "1 week ago" },
];

const AdminDocuments = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Manage documents and content for RAG</p>
        </div>
        <Button className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Folder className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">223</p>
                <p className="text-sm text-muted-foreground">Total Chunks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>Documents indexed for AI retrieval</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.type}</Badge>
                  </TableCell>
                  <TableCell>{doc.size}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "Processed" ? "outline" : "secondary"} className={doc.status === "Processed" ? "border-green-500 text-green-500" : "border-yellow-500 text-yellow-500"}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.chunks}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.uploadedAt}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDocuments;

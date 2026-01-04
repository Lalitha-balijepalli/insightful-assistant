import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: string;
  chunks_count: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const useDocuments = () => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Fetch documents
  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey: ["documents", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user,
    // Refetch every 3 seconds while there are processing documents
    refetchInterval: (query) => {
      const docs = query.state.data as Document[] | undefined;
      const hasProcessing = docs?.some((d) => d.status === "processing");
      return hasProcessing ? 3000 : false;
    },
  });

  // Real-time subscription for document status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("document-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Document;
          // Show toast when processing completes
          if (updated.status === "processed") {
            toast.success(`"${updated.name}" processed successfully`);
          } else if (updated.status === "error") {
            toast.error(`Failed to process "${updated.name}"`);
          }
          // Refresh documents list
          queryClient.invalidateQueries({ queryKey: ["documents"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Upload document
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !session) {
        throw new Error("Not authenticated");
      }

      const fileId = crypto.randomUUID();
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      const storagePath = `${user.id}/${fileId}.${fileExt}`;

      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress((prev) => ({ ...prev, [file.name]: 50 }));

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          name: file.name,
          file_type: file.type || `application/${fileExt}`,
          file_size: file.size,
          storage_path: storagePath,
          status: "processing",
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file
        await supabase.storage.from("documents").remove([storagePath]);
        throw new Error(`Failed to create record: ${dbError.message}`);
      }

      setUploadProgress((prev) => ({ ...prev, [file.name]: 75 }));

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke("process-document", {
        body: { documentId: document.id },
      });

      if (processError) {
        console.error("Processing error:", processError);
        // Don't throw, document was uploaded but processing failed
        toast.error("Document uploaded but processing failed. You can retry later.");
      }

      setUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[file.name];
        return updated;
      });

      return document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Get document to find storage path
      const { data: doc, error: fetchError } = await supabase
        .from("documents")
        .select("storage_path")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (doc?.storage_path) {
        await supabase.storage.from("documents").remove([doc.storage_path]);
      }

      // Delete chunks (cascade should handle this, but being explicit)
      await supabase.from("document_chunks").delete().eq("document_id", documentId);

      // Delete document record
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Reprocess document
  const reprocessMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!session) throw new Error("Not authenticated");

      // Set status to processing
      await supabase
        .from("documents")
        .update({ status: "processing" })
        .eq("id", documentId);

      // Trigger reprocessing
      const { error } = await supabase.functions.invoke("process-document", {
        body: { documentId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document reprocessing started");
    },
    onError: (error: Error) => {
      toast.error(`Reprocessing failed: ${error.message}`);
    },
  });

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((file) => {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
          "application/pdf",
          "text/plain",
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large (max 50MB)`);
          return false;
        }
        
        // Allow by extension if type is empty
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!allowedTypes.includes(file.type) && !["pdf", "txt", "csv", "xlsx", "xls"].includes(ext || "")) {
          toast.error(`${file.name} is not a supported file type`);
          return false;
        }
        
        return true;
      });

      for (const file of validFiles) {
        await uploadMutation.mutateAsync(file);
      }
    },
    [uploadMutation]
  );

  return {
    documents,
    isLoading,
    error,
    refetch,
    uploadFiles,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    reprocessDocument: reprocessMutation.mutate,
    isReprocessing: reprocessMutation.isPending,
  };
};

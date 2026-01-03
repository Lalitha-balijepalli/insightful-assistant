-- Allow document chunk inserts via service role (edge function)
-- The edge function uses service role key, so RLS is bypassed
-- But we need to ensure users can also insert if needed in the future

-- Add policy to allow service role to manage chunks (already bypassed but for clarity)
-- We'll add a policy that allows users to insert chunks for their own documents

CREATE POLICY "Users can insert chunks for own documents"
ON public.document_chunks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_chunks.document_id 
    AND documents.user_id = auth.uid()
  )
);

-- Add delete policy for document chunks (needed for reprocessing)
CREATE POLICY "Users can delete chunks from own documents"
ON public.document_chunks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_chunks.document_id 
    AND documents.user_id = auth.uid()
  )
);
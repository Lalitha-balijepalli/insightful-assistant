-- Add UPDATE and DELETE policies for task_logs table
-- Users should be able to update and delete their own task logs

CREATE POLICY "Users can update own task logs"
ON public.task_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task logs"
ON public.task_logs
FOR DELETE
USING (auth.uid() = user_id);
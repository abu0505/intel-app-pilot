-- Drop existing policy if it exists and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.chat_histories;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create the delete policy
CREATE POLICY "Users can delete their own chat history"
ON public.chat_histories FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_histories_session_created 
ON public.chat_histories(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_histories_user_session 
ON public.chat_histories(user_id, session_id, created_at);
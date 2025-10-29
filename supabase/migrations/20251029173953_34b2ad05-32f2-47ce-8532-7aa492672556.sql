-- Create notebooks table
CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_last_opened ON public.notebooks(last_opened_at DESC);

-- Enable RLS
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notebooks
CREATE POLICY "Users can view their own notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notebooks"
  ON public.notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
  ON public.notebooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
  ON public.notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Add notebook_id to existing tables
ALTER TABLE public.sources 
ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

ALTER TABLE public.chat_histories 
ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sources_notebook_id ON public.sources(notebook_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_notebook_id ON public.chat_histories(notebook_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_notebook_id ON public.quizzes(notebook_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_notebook_id ON public.flashcards(notebook_id);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY,
  last_opened_notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Trigger to update updated_at on notebooks
CREATE OR REPLACE FUNCTION update_notebooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_notebooks_updated_at();
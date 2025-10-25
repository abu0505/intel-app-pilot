-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_ids UUID[] DEFAULT '{}',
  title VARCHAR(500) NOT NULL,
  card_count INTEGER DEFAULT 15,
  cards JSONB NOT NULL,
  study_algorithm VARCHAR(50) DEFAULT 'sm2',
  times_studied INTEGER DEFAULT 0,
  average_retention_percentage NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flashcard study progress table (for SM2 algorithm)
CREATE TABLE public.flashcard_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flashcard_id UUID NOT NULL,
  user_id UUID NOT NULL,
  card_index INTEGER NOT NULL,
  repetitions INTEGER DEFAULT 0,
  easiness_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  is_learned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Flashcards policies
CREATE POLICY "Users can view their own flashcards"
  ON public.flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards"
  ON public.flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
  ON public.flashcards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = user_id);

-- Flashcard progress policies
CREATE POLICY "Users can view their own progress"
  ON public.flashcard_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.flashcard_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.flashcard_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON public.flashcard_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcard_progress_user_id ON public.flashcard_progress(user_id);
CREATE INDEX idx_flashcard_progress_next_review ON public.flashcard_progress(next_review_at);
CREATE INDEX idx_flashcard_progress_flashcard_id ON public.flashcard_progress(flashcard_id);

-- Create trigger for updated_at
CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcard_progress_updated_at
  BEFORE UPDATE ON public.flashcard_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
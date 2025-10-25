-- Complete Schema Migration for Fresh Supabase Database
-- This creates all tables, policies, functions, and triggers needed for the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username character varying,
  full_name character varying,
  avatar_url text,
  total_sources_uploaded integer DEFAULT 0,
  total_quizzes_generated integer DEFAULT 0,
  total_study_hours numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type character varying NOT NULL,
  source_name character varying NOT NULL,
  source_description text,
  source_url text,
  content text NOT NULL,
  content_hash character varying,
  word_count integer,
  key_topics text[] DEFAULT '{}'::text[],
  ai_summary text,
  processing_status character varying DEFAULT 'completed'::character varying,
  is_archived boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sources"
ON public.sources FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sources"
ON public.sources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources"
ON public.sources FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources"
ON public.sources FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for sources updated_at
CREATE TRIGGER update_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- EMBEDDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),
  created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view embeddings from their sources"
ON public.embeddings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM sources
  WHERE sources.id = embeddings.source_id
  AND sources.user_id = auth.uid()
));

CREATE POLICY "Users can insert embeddings for their sources"
ON public.embeddings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM sources
  WHERE sources.id = embeddings.source_id
  AND sources.user_id = auth.uid()
));

-- ============================================
-- CHAT HISTORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_histories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type character varying,
  content text NOT NULL,
  sources_referenced uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat history"
ON public.chat_histories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
ON public.chat_histories FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title character varying NOT NULL,
  source_ids uuid[] DEFAULT '{}'::uuid[],
  question_count integer DEFAULT 10,
  difficulty_level character varying DEFAULT 'medium'::character varying,
  questions jsonb NOT NULL,
  times_taken integer DEFAULT 0,
  average_score_percentage numeric DEFAULT 0.0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quizzes"
ON public.quizzes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes"
ON public.quizzes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
ON public.quizzes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes"
ON public.quizzes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for quizzes updated_at
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- QUIZ ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers_provided jsonb NOT NULL,
  correct_answers integer,
  score_percentage numeric NOT NULL,
  time_spent_seconds integer,
  is_passed boolean,
  completed_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz attempts"
ON public.quiz_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FLASHCARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title character varying NOT NULL,
  source_ids uuid[] DEFAULT '{}'::uuid[],
  card_count integer DEFAULT 15,
  cards jsonb NOT NULL,
  study_algorithm character varying DEFAULT 'sm2'::character varying,
  times_studied integer DEFAULT 0,
  average_retention_percentage numeric DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

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

-- Trigger for flashcards updated_at
CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FLASHCARD PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcard_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_index integer NOT NULL,
  repetitions integer DEFAULT 0,
  easiness_factor numeric DEFAULT 2.5,
  interval_days integer DEFAULT 1,
  last_reviewed_at timestamp with time zone,
  next_review_at timestamp with time zone,
  is_learned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(flashcard_id, user_id, card_index)
);

ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

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

-- Trigger for flashcard_progress updated_at
CREATE TRIGGER update_flashcard_progress_updated_at
BEFORE UPDATE ON public.flashcard_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sources_user_id ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source_id ON public.embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_user_id ON public.chat_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_session_id ON public.chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user_id ON public.flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_flashcard_id ON public.flashcard_progress(flashcard_id);

-- Vector similarity index for embeddings
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON public.embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE public.profiles IS 'User profiles with study statistics';
COMMENT ON TABLE public.sources IS 'Learning materials uploaded by users';
COMMENT ON TABLE public.embeddings IS 'Vector embeddings for semantic search';
COMMENT ON TABLE public.chat_histories IS 'AI chat conversation history';
COMMENT ON TABLE public.quizzes IS 'Generated quizzes from sources';
COMMENT ON TABLE public.quiz_attempts IS 'User quiz attempt records';
COMMENT ON TABLE public.flashcards IS 'Generated flashcard sets';
COMMENT ON TABLE public.flashcard_progress IS 'Spaced repetition progress tracking';

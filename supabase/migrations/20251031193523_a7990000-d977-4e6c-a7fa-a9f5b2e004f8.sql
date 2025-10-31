-- Drop the trigger and function using CASCADE to handle dependencies
DROP TRIGGER IF EXISTS update_notebooks_updated_at ON public.notebooks CASCADE;
DROP FUNCTION IF EXISTS public.update_notebooks_updated_at() CASCADE;

-- Note: updated_at will now only be updated manually when actual content changes occur
-- (chat messages, sources added, flashcards/quizzes generated, name/icon changed)
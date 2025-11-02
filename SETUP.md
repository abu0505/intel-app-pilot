# NexonAI Local Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **pnpm** (recommended)
- **Git** ([Download](https://git-scm.com/))
- **Supabase CLI** (optional, for local development)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexonai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   The project uses Lovable Cloud (managed Supabase), so most environment variables are auto-configured. However, you'll need to ensure these are set:

   ```env
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
   VITE_SUPABASE_PROJECT_ID=<your-project-id>
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

   The application will be available at `http://localhost:5173`

## Database Schema

### Core Tables

The database consists of the following main tables:

#### 1. **profiles**
Stores user profile information.
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username VARCHAR,
  full_name VARCHAR,
  avatar_url TEXT,
  total_study_hours NUMERIC DEFAULT 0,
  total_quizzes_generated INTEGER DEFAULT 0,
  total_sources_uploaded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 2. **notebooks**
Organizes sources into collections.
```sql
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_opened_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);
```

#### 3. **sources**
Stores study materials (text, PDFs, websites, YouTube videos).
```sql
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notebook_id UUID REFERENCES public.notebooks(id),
  source_type VARCHAR NOT NULL, -- 'text', 'website', 'youtube', 'pdf'
  source_name VARCHAR NOT NULL,
  source_url TEXT,
  content TEXT NOT NULL,
  content_hash VARCHAR,
  word_count INTEGER,
  ai_summary TEXT,
  key_topics TEXT[],
  processing_status VARCHAR DEFAULT 'completed',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 4. **embeddings**
Stores vector embeddings for semantic search.
```sql
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536), -- Requires pgvector extension
  created_at TIMESTAMP DEFAULT now()
);
```

#### 5. **chat_histories**
Stores AI chat conversations.
```sql
CREATE TABLE public.chat_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id),
  message_type VARCHAR, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  sources_referenced UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);
```

#### 6. **flashcards**
Stores generated flashcard sets.
```sql
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notebook_id UUID REFERENCES public.notebooks(id),
  title VARCHAR NOT NULL,
  cards JSONB NOT NULL, -- Array of {front, back} objects
  card_count INTEGER DEFAULT 15,
  source_ids UUID[] DEFAULT '{}',
  study_algorithm VARCHAR DEFAULT 'sm2',
  times_studied INTEGER DEFAULT 0,
  average_retention_percentage NUMERIC DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. **flashcard_progress**
Tracks individual card learning progress using spaced repetition.
```sql
CREATE TABLE public.flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  card_index INTEGER NOT NULL,
  repetitions INTEGER DEFAULT 0,
  easiness_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  is_learned BOOLEAN DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. **quizzes**
Stores generated quiz sets.
```sql
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notebook_id UUID REFERENCES public.notebooks(id),
  title VARCHAR NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects
  question_count INTEGER DEFAULT 10,
  difficulty_level VARCHAR DEFAULT 'medium',
  source_ids UUID[] DEFAULT '{}',
  times_taken INTEGER DEFAULT 0,
  average_score_percentage NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 9. **quiz_attempts**
Tracks quiz attempt results.
```sql
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score_percentage NUMERIC NOT NULL,
  correct_answers INTEGER,
  answers_provided JSONB NOT NULL,
  time_spent_seconds INTEGER,
  is_passed BOOLEAN,
  completed_at TIMESTAMP DEFAULT now()
);
```

### Row Level Security (RLS) Policies

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Example for sources table
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
```

## Edge Functions

The project uses Supabase Edge Functions (Deno) for backend logic:

### Available Functions

1. **ai-chat** - Handles AI chat conversations with context
2. **generate-embeddings** - Creates vector embeddings for sources
3. **generate-flashcards** - Generates flashcard sets from sources
4. **generate-quiz** - Creates quiz questions from sources
5. **generate-summary** - Summarizes source content
6. **generate-notebook-name** - Generates titles for sources/notebooks
7. **fetch-youtube-transcript** - Fetches YouTube video transcripts
8. **youtube-transcript** - Alternative YouTube transcript fetcher
9. **process-pdf-ocr** - Extracts text from PDFs using OCR
10. **change-password** - Handles password changes
11. **request-password-reset** - Initiates password reset flow
12. **reset-password** - Completes password reset

### Required Secrets

The following secrets need to be configured in your Supabase project:

- `GOOGLE_AI_API_KEY` - For Gemini AI models (used by ai-chat and generation functions)
- `LOVABLE_API_KEY` - For Lovable AI integration (auto-configured in Lovable Cloud)
- `RAPIDAPI_KEY` (optional) - For enhanced YouTube transcript fetching

## Authentication

The app uses Supabase Auth with email/password authentication:

- **Auto-confirm email signups** are enabled for development
- Users are automatically assigned a profile on signup via database trigger

### Auth Configuration

Email auto-confirm should be enabled in your Supabase project:
```sql
-- This is configured via Supabase dashboard or CLI
-- Settings -> Auth -> Email Auth -> Enable auto-confirm
```

## Development Workflow

### Running Locally

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Working with Edge Functions

Edge functions are automatically deployed when you push to your Lovable project. For local testing:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (optional)
supabase start

# Deploy a specific function
supabase functions deploy ai-chat
```

### Database Migrations

When making schema changes, use the Lovable migration tool or Supabase CLI:

```bash
# Create a new migration
supabase migration new your_migration_name

# Apply migrations
supabase db push
```

## Troubleshooting

### Common Issues

**Issue: "Missing Authorization header"**
- Solution: Ensure you're passing the Supabase auth token in requests

**Issue: YouTube transcript fetching fails**
- Solution: Check that the video has captions enabled. Try with a different video or ensure RAPIDAPI_KEY is set for fallback.

**Issue: AI responses are slow**
- Solution: This is normal for the first request. Subsequent requests use cached embeddings and are faster.

**Issue: Database connection errors**
- Solution: Verify your environment variables are correct and your Supabase project is active.

**Issue: Chat history not maintaining context**
- Solution: Ensure the latest migration has been applied which adds indexes for chat history queries.

### Debug Mode

Enable verbose logging by checking the browser console and Supabase Edge Function logs.

## Testing

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit
```

## Deployment

The project is designed to be deployed on Lovable Cloud, which handles:
- Automatic deployments from Git
- Edge function deployment
- Database migrations
- Environment variable management

For manual deployment to Vercel/Netlify:
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Configure environment variables in your hosting platform

## Support

For issues or questions:
- Check the [Lovable Documentation](https://docs.lovable.dev)
- Review existing GitHub issues
- Contact support at support@lovable.dev

## License

[Add your license information here]

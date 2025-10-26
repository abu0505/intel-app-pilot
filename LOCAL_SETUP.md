# Local Development Setup Guide

This guide will help you set up local development with your own Supabase database.

## Step 1: Run the Database Migration

We've already set up your database connection. Now run the migration to create all tables:

```bash
node scripts/setup_external_supabase.mjs
```

This will:
- Create all required tables (profiles, sources, embeddings, chat_histories, quizzes, quiz_attempts, flashcards, flashcard_progress)
- Set up Row Level Security (RLS) policies
- Create necessary indexes and triggers
- Verify everything was created correctly

## Step 2: Get Your Supabase API Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `mcvohdpjzihslxkpajqd`
3. Navigate to **Settings** → **API**
4. Copy these values:
   - **Project URL**: `https://mcvohdpjzihslxkpajqd.supabase.co`
   - **anon/public key**: This is your publishable key
   - **service_role key**: This is your service role key (keep it secret!)

## Step 3: Configure Local Environment

Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://mcvohdpjzihslxkpajqd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=mcvohdpjzihslxkpajqd
```

## Step 4: Configure Edge Functions Secrets

For the AI features to work, you need to set up secrets in your Supabase project:

1. In Supabase Dashboard, go to **Settings** → **Edge Functions**
2. Add these secrets:
   - `SUPABASE_URL`: `https://mcvohdpjzihslxkpajqd.supabase.co`
   - `SUPABASE_ANON_KEY`: Your anon key from Step 2
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key from Step 2
   - `GOOGLE_AI_API_KEY`: Your Google AI API key (for Gemini models)

### Getting a Google AI API Key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your Supabase Edge Functions secrets

## Step 5: Enable Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Go to **Email Templates** → **Confirm Signup**
4. For development, you can disable email confirmation:
   - Go to **Authentication** → **Settings**
   - Disable "Enable email confirmations"

## Step 6: Deploy Edge Functions

These functions must be deployed at least once before they are available in your Supabase project. Run this from the project root after installing the Supabase CLI:

```bash
# Install Supabase CLI if you don't already have it
npm install -g supabase

# Authenticate and link to the project
supabase login
supabase link --project-ref mcvohdpjzihslxkpajqd

# Deploy each function (first run creates it, subsequent runs update it)
supabase functions deploy ai-chat
supabase functions deploy generate-quiz
supabase functions deploy generate-flashcards
supabase functions deploy generate-embeddings
```

If you prefer a one-liner, you can deploy all functions sequentially with:

```bash
for fn in ai-chat generate-quiz generate-flashcards generate-embeddings; do
  supabase functions deploy "$fn" --project-ref mcvohdpjzihslxkpajqd || break
done
```

Deploying ensures Supabase creates the functions before any redeployment task runs.

## Step 7: Start Local Development

```bash
npm run dev
```

Your app should now connect to your Supabase database!

## Database Schema Overview

Your database includes these tables:

- **profiles**: User profiles and study statistics
- **sources**: Learning materials uploaded by users
- **embeddings**: Vector embeddings for semantic search
- **chat_histories**: AI chat conversation history
- **quizzes**: Generated quizzes from sources
- **quiz_attempts**: User quiz attempt records
- **flashcards**: Generated flashcard sets
- **flashcard_progress**: Spaced repetition progress tracking

All tables have proper Row Level Security (RLS) policies to ensure users can only access their own data.

## Troubleshooting

### "Invalid API key" error
- Double-check your API keys in `.env.local`
- Make sure you copied the correct keys from Supabase dashboard

### Edge functions not working
- Verify all secrets are set in Supabase Dashboard
- Check edge function logs in Supabase Dashboard → Edge Functions → Logs

### Database connection issues
- Verify your password is correct: `Abuturab@3110`
- Check if you can connect using the Supabase dashboard SQL editor

### RLS policy errors
- Make sure you're signed in to the app
- Check that RLS policies exist: Run `SELECT * FROM pg_policies WHERE schemaname = 'public';` in SQL editor

## Need Help?

Check the Supabase documentation:
- [Database](https://supabase.com/docs/guides/database)
- [Authentication](https://supabase.com/docs/guides/auth)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Storage](https://supabase.com/docs/guides/storage)

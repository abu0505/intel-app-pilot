# Intel App Pilot

Intel App Pilot is an AI-assisted study companion that helps learners generate quizzes, flashcards, summaries, and chat responses from their uploaded sources.

## Tech Stack

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (database, auth, edge functions)
- Google Gemini APIs for AI-assisted content generation

## Getting Started

### Prerequisites

- Node.js 20+
- npm or bun (project uses npm lockfile)
- Supabase project with service role key and URL
- Google AI Studio API key (Gemini)

### Installation

```sh
git clone <REPO_URL>
cd intel-app-pilot
npm install
```

Create a `.env` file based on `.env.example` (or update the provided values) with your Supabase credentials and Google AI key.

### Development

```sh
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Building for Production

```sh
npm run build
npm run preview
```

## Supabase Edge Functions

Edge functions live under `supabase/functions/` and power AI features (quizzes, flashcards, chat, summaries). Deploy them with the Supabase CLI:

```sh
supabase functions deploy generate-quiz
supabase functions deploy generate-flashcards
supabase functions deploy generate-summary
supabase functions deploy ai-chat
```

Refer to `PASSWORD_MANAGEMENT.md` and `SETUP_PASSWORD_SYSTEM.md` for the password reset/change flow.

## Testing & Linting

```sh
npm run lint
```

_Additional automated tests can be added under `src/__tests__/`._

## Project Structure

```
src/
  components/
  contexts/
  hooks/
  pages/
supabase/
  functions/
  migrations/
```

Feel free to extend the project with new study tools or integrations as needed.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Profiles table for additional user information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    total_sources_uploaded INTEGER DEFAULT 0,
    total_quizzes_generated INTEGER DEFAULT 0,
    total_study_hours DECIMAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Sources table for uploaded learning materials
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    source_type VARCHAR(20) CHECK (source_type IN ('website', 'youtube', 'pdf', 'docx', 'text')) NOT NULL,
    source_name VARCHAR(500) NOT NULL,
    source_description TEXT,
    source_url TEXT,
    content TEXT NOT NULL,
    content_hash VARCHAR(64),
    word_count INTEGER,
    processing_status VARCHAR(50) DEFAULT 'completed',
    ai_summary TEXT,
    key_topics TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Sources policies
CREATE POLICY "Users can view their own sources"
    ON sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sources"
    ON sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources"
    ON sources FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources"
    ON sources FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX idx_sources_user_id ON sources(user_id);
CREATE INDEX idx_sources_created ON sources(created_at DESC);

-- Embeddings table for RAG
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Embeddings policies (users can only access embeddings from their sources)
CREATE POLICY "Users can view embeddings from their sources"
    ON embeddings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sources 
            WHERE sources.id = embeddings.source_id 
            AND sources.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert embeddings for their sources"
    ON embeddings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sources 
            WHERE sources.id = embeddings.source_id 
            AND sources.user_id = auth.uid()
        )
    );

-- Create HNSW index for fast similarity search
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_embeddings_source_id ON embeddings(source_id);

-- Chat history table
CREATE TABLE chat_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID DEFAULT gen_random_uuid(),
    message_type VARCHAR(20) CHECK (message_type IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources_referenced UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Chat history policies
CREATE POLICY "Users can view their own chat history"
    ON chat_histories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
    ON chat_histories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chat_user_id ON chat_histories(user_id);
CREATE INDEX idx_chat_session_id ON chat_histories(session_id);

-- Quizzes table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    source_ids UUID[] DEFAULT '{}',
    title VARCHAR(500) NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    question_count INTEGER DEFAULT 10,
    questions JSONB NOT NULL,
    times_taken INTEGER DEFAULT 0,
    average_score_percentage DECIMAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Users can view their own quizzes"
    ON quizzes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes"
    ON quizzes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
    ON quizzes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes"
    ON quizzes FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score_percentage DECIMAL NOT NULL,
    time_spent_seconds INTEGER,
    answers_provided JSONB NOT NULL,
    correct_answers INTEGER,
    is_passed BOOLEAN,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quiz attempts policies
CREATE POLICY "Users can view their own quiz attempts"
    ON quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_attempts_user_id ON quiz_attempts(user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
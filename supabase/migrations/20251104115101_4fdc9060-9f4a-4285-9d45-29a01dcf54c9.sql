-- Add processing_status and source_description columns to sources table
ALTER TABLE sources 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS source_description TEXT;

-- Add index for processing_status for better query performance
CREATE INDEX IF NOT EXISTS idx_sources_processing_status ON sources(processing_status);

-- Enable realtime for sources table to get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE sources;
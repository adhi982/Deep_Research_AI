-- Fix for research_progress_new table
-- This script redefines the table to use TEXT for IDs instead of UUID

-- 1. Create a backup of the original table (just in case)
CREATE TABLE IF NOT EXISTS research_progress_backup AS
SELECT * FROM research_progress_new;

-- 2. Drop the original table
DROP TABLE IF EXISTS research_progress_new;

-- 3. Create a new table with the correct column types
CREATE TABLE research_progress_new (
  progress_id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create indexes for better performance
CREATE INDEX idx_research_progress_research_id ON research_progress_new(research_id);
CREATE INDEX idx_research_progress_links ON research_progress_new USING GIN (links);

-- 5. Function to add a single link to a topic - updated to use TEXT type for IDs
CREATE OR REPLACE FUNCTION add_link_to_topic(
  p_progress_id TEXT,
  p_url TEXT,
  p_title TEXT
) RETURNS JSONB AS $$
DECLARE
  current_links JSONB;
  new_link JSONB;
  result JSONB;
BEGIN
  -- Get current links
  SELECT links INTO current_links FROM research_progress_new 
  WHERE progress_id = p_progress_id;
  
  -- If no record found or null links, initialize as empty array
  IF current_links IS NULL THEN
    current_links := '[]'::jsonb;
  END IF;
  
  -- Create the new link object
  new_link := jsonb_build_object('url', p_url, 'title', p_title);
  
  -- Check if this URL already exists in the links
  IF current_links @> jsonb_build_array(jsonb_build_object('url', p_url)) THEN
    -- URL already exists, do nothing
    RETURN current_links;
  END IF;
  
  -- Append new link to existing ones
  result := current_links || jsonb_build_array(new_link);
  
  -- Update the record
  UPDATE research_progress_new
  SET links = result
  WHERE progress_id = p_progress_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Restore data from backup if it exists (this will fail if the backup doesn't exist, which is fine)
INSERT INTO research_progress_new
SELECT progress_id::TEXT, research_id::TEXT, user_id::TEXT, topic, links, created_at
FROM research_progress_backup
ON CONFLICT (progress_id) DO NOTHING; 
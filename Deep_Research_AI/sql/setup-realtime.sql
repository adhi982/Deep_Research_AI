-- SQL to set up real-time functionality for the research_questions_array table

-- Step 1: Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Make sure the replication publication exists
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Step 3: Add the research_questions_array table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE research_questions_array;

-- Step 4: Create or replace a trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a trigger to use this function
DROP TRIGGER IF EXISTS update_research_questions_timestamp ON research_questions_array;
CREATE TRIGGER update_research_questions_timestamp
BEFORE UPDATE ON research_questions_array
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Step 6: Add an index to improve performance for real-time queries
CREATE INDEX IF NOT EXISTS idx_research_questions_array_research_id ON research_questions_array (research_id);

-- Step 7: Give proper permissions to anon users for testing
GRANT SELECT, INSERT, UPDATE ON research_questions_array TO anon; 
 
 
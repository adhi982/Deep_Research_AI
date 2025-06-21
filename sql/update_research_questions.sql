-- SQL to create and set up the research_questions_array table

-- Step 1: Create a new table with the desired structure
CREATE TABLE IF NOT EXISTS research_questions_array (
  question_id VARCHAR PRIMARY KEY,
  research_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  reply_webhook_url VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Enable row level security
ALTER TABLE research_questions_array ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy for selecting records
CREATE POLICY "Users can view their own research questions" 
  ON research_questions_array
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Step 4: Create policy for inserting records
CREATE POLICY "Users can insert their own research questions" 
  ON research_questions_array
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Step 5: Create policy for updating records
CREATE POLICY "Users can update their own research questions" 
  ON research_questions_array
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Step 6: Create function to batch insert questions
CREATE OR REPLACE FUNCTION insert_batch_questions(
  p_question_id VARCHAR,
  p_research_id VARCHAR, 
  p_user_id VARCHAR,
  p_questions JSONB,
  p_reply_webhook_url VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO research_questions_array (
    question_id,
    research_id,
    user_id,
    questions,
    answers,
    reply_webhook_url,
    created_at,
    updated_at
  ) VALUES (
    p_question_id,
    p_research_id,
    p_user_id,
    p_questions,
    '[]'::jsonb,
    p_reply_webhook_url,
    now(),
    now()
  )
  RETURNING to_jsonb(research_questions_array.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to update answers
CREATE OR REPLACE FUNCTION update_batch_answers(
  p_question_id VARCHAR,
  p_answers JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  question_record research_questions_array;
BEGIN
  -- First get the current record
  SELECT * INTO question_record 
  FROM research_questions_array 
  WHERE question_id = p_question_id;
  
  -- If record not found, return null
  IF question_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update the record with new answers and update timestamp
  UPDATE research_questions_array
  SET 
    answers = p_answers,
    updated_at = now()
  WHERE question_id = p_question_id
  RETURNING to_jsonb(research_questions_array.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create real-time publication for the new table
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE research_questions_array;

-- Note: You can migrate data from the old table if needed using:
-- INSERT INTO research_questions_array (...)
-- SELECT ... FROM research_questions_new
-- This would require custom conversion logic for your data 
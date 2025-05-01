-- SQL to update a single answer in the research_questions_array table
-- This ensures answers are properly saved when submitted individually

-- Drop any existing version first to avoid conflicts
DROP FUNCTION IF EXISTS public.update_single_batch_answer(VARCHAR, VARCHAR, TEXT);

-- Create a simpler and more robust function to update a single answer in the batch
CREATE OR REPLACE FUNCTION public.update_single_batch_answer(
  p_question_id VARCHAR,     -- Base question ID (batch ID)
  p_question_item_id VARCHAR, -- Individual question item ID
  p_answer TEXT               -- The answer text
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  question_record RECORD;
  updated_answers JSONB;
  existing_index INTEGER := -1;
  i INTEGER;
BEGIN
  -- First get the current record
  SELECT * INTO question_record 
  FROM research_questions_array 
  WHERE question_id = p_question_id;
  
  -- If record not found, return error
  IF question_record IS NULL THEN
    RAISE EXCEPTION 'Question batch with ID % does not exist', p_question_id;
  END IF;
  
  -- Log for debugging
  RAISE NOTICE 'Processing answer for batch %, question %', p_question_id, p_question_item_id;
  
  -- Initialize updated answers with current answers or empty array
  IF question_record.answers IS NULL THEN
    updated_answers := '[]'::jsonb;
    RAISE NOTICE 'Answers array was NULL, initialized empty array';
  ELSE
    updated_answers := question_record.answers;
    RAISE NOTICE 'Current answers array has % items', jsonb_array_length(updated_answers);
  END IF;
  
  -- Check if we already have an answer for this question
  IF jsonb_array_length(updated_answers) > 0 THEN
    FOR i IN 0..jsonb_array_length(updated_answers) - 1 LOOP
      IF updated_answers->i->>'id' = p_question_item_id THEN
        existing_index := i;
        RAISE NOTICE 'Found existing answer at index %', i;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Generate timestamp for the answer
  DECLARE answer_timestamp TEXT := (now() AT TIME ZONE 'UTC')::text;
  
  -- If found, update the existing answer
  IF existing_index >= 0 THEN
    RAISE NOTICE 'Updating existing answer at index %', existing_index;
    updated_answers := jsonb_set(
      updated_answers,
      ARRAY[existing_index::text],
      jsonb_build_object(
        'id', p_question_item_id,
        'text', COALESCE(updated_answers->existing_index->>'text', ''),
        'answer', p_answer,
        'answered', true,
        'updated_at', answer_timestamp
      )
    );
  ELSE
    -- If not found, add a new answer
    RAISE NOTICE 'Adding new answer';
    updated_answers := updated_answers || jsonb_build_object(
      'id', p_question_item_id,
      'text', '',
      'answer', p_answer,
      'answered', true,
      'created_at', answer_timestamp,
      'updated_at', answer_timestamp
    );
  END IF;
  
  RAISE NOTICE 'Updated answers array now has % items', jsonb_array_length(updated_answers);
  
  -- Update the question record's answered status too
  -- First get the questions array
  DECLARE updated_questions JSONB := question_record.questions;
  DECLARE question_index INTEGER := -1;
  
  -- Find the question in the array
  IF jsonb_array_length(updated_questions) > 0 THEN
    FOR i IN 0..jsonb_array_length(updated_questions) - 1 LOOP
      IF updated_questions->i->>'id' = p_question_item_id THEN
        question_index := i;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- If found, update the question's answered status
  IF question_index >= 0 THEN
    RAISE NOTICE 'Updating question answered status at index %', question_index;
    updated_questions := jsonb_set(
      updated_questions,
      ARRAY[question_index::text, 'answered'],
      'true'
    );
  END IF;
  
  -- Update both the answers and questions arrays in the database
  UPDATE research_questions_array
  SET 
    answers = updated_answers,
    questions = COALESCE(updated_questions, questions),
    updated_at = now()
  WHERE question_id = p_question_id
  RETURNING to_jsonb(research_questions_array.*) INTO result;
  
  -- If no rows were updated, something went wrong
  IF result IS NULL THEN
    RAISE EXCEPTION 'Failed to update answers for batch %', p_question_id;
  END IF;
  
  RAISE NOTICE 'Successfully updated answers for batch %', p_question_id;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_single_batch_answer(%,%,%): %', 
      p_question_id, p_question_item_id, left(p_answer, 50), SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new RPC endpoint for this function
COMMENT ON FUNCTION update_single_batch_answer IS 'Updates a single answer in a question batch and marks the question as answered'; 
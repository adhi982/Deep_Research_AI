-- Fix for the add_link_to_topic function
-- This script only creates a TEXT-only version of the function
-- Much simpler approach focused on TEXT IDs

-- Drop the existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.add_link_to_topic(uuid, text, text);
DROP FUNCTION IF EXISTS public.add_link_to_topic(text, text, text);

-- Create a single function that works with TEXT progress_id
CREATE OR REPLACE FUNCTION public.add_link_to_topic(
  p_progress_id TEXT,
  p_url TEXT,
  p_title TEXT
) RETURNS JSONB AS $$
DECLARE
  current_links JSONB;
  link_object JSONB;
  exists_already BOOLEAN := FALSE;
  topic_exists BOOLEAN;
  timestamp TEXT;
BEGIN
  -- Check if the topic exists
  SELECT EXISTS(
    SELECT 1 FROM research_progress_new WHERE progress_id = p_progress_id
  ) INTO topic_exists;
  
  IF NOT topic_exists THEN
    RAISE EXCEPTION 'Topic with ID % does not exist', p_progress_id;
  END IF;

  -- Get the current links array
  SELECT links INTO current_links FROM research_progress_new
  WHERE progress_id = p_progress_id;

  -- If links is null, initialize as empty array
  IF current_links IS NULL THEN
    current_links := '[]'::JSONB;
  END IF;

  -- Generate timestamp for the link
  timestamp := (now() AT TIME ZONE 'UTC')::text;

  -- Create the new link object
  link_object := jsonb_build_object(
    'url', p_url,
    'title', p_title,
    'added_at', timestamp
  );

  -- Check if this link already exists in the array (prevents duplicates)
  IF jsonb_array_length(current_links) > 0 THEN
    FOR i IN 0..jsonb_array_length(current_links) - 1 LOOP
      IF current_links->i->>'url' = p_url THEN
        exists_already := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Only add if it doesn't exist already
  IF NOT exists_already THEN
    -- Add the new link to the array
    current_links := current_links || link_object;

    -- Update the links in the database
    UPDATE research_progress_new
    SET links = current_links
    WHERE progress_id = p_progress_id;
  END IF;

  -- Return the updated links array
  RETURN current_links;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in add_link_to_topic: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql; 
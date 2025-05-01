-- Drop the duplicate table if it exists
DROP TABLE IF EXISTS public.research_feedbacks;

-- Create or update the research_feedback table
CREATE TABLE IF NOT EXISTS public.research_feedback (
    feedback_id VARCHAR PRIMARY KEY,
    research_id VARCHAR NOT NULL,
    user_id VARCHAR,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_research_id FOREIGN KEY (research_id)
        REFERENCES public.research_history_new (research_id)
        ON DELETE CASCADE
);

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_research_feedback_research_id ON public.research_feedback (research_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.research_feedback ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing
-- In production, these should be tightened for proper data isolation
CREATE POLICY "Allow insert for authenticated users" ON public.research_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for authenticated users" ON public.research_feedback
  FOR SELECT USING (true);

-- Create RPC function to submit feedback that bypasses RLS
CREATE OR REPLACE FUNCTION public.submit_research_feedback(
    p_feedback_id VARCHAR,
    p_research_id VARCHAR,
    p_user_id VARCHAR,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL,
    p_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    
    -- Insert feedback
    INSERT INTO public.research_feedback (
        feedback_id, research_id, user_id, rating, comment, created_at
    ) VALUES (
        p_feedback_id, p_research_id, p_user_id, p_rating, p_comment, p_created_at
    )
    RETURNING to_jsonb(research_feedback.*) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
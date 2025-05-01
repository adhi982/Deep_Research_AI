-- First, we need to remove the existing constraints
ALTER TABLE public.research_results_new DROP CONSTRAINT IF EXISTS research_results_new_pkey;
ALTER TABLE public.research_results_new DROP CONSTRAINT IF EXISTS research_results_new_research_id_fkey;

-- Modify research_id to NOT be NULL
ALTER TABLE public.research_results_new ALTER COLUMN research_id SET NOT NULL;

-- Two options depending on your requirements:

-- OPTION 1: If you want research_id to be the ONLY primary key
-- This means one research can have only one result
ALTER TABLE public.research_results_new ADD PRIMARY KEY (research_id);

-- OPTION 2: If you want result_id to remain as primary key but ensure research_id is also unique
-- Uncomment the lines below if you prefer this approach
-- Keep result_id as primary key
-- ALTER TABLE public.research_results_new ADD PRIMARY KEY (result_id);
-- Add unique constraint on research_id
-- ALTER TABLE public.research_results_new ADD CONSTRAINT research_results_new_research_id_unique UNIQUE (research_id);

-- Add foreign key relationship to research_history_new
ALTER TABLE public.research_results_new
  ADD CONSTRAINT research_results_new_research_id_fkey
  FOREIGN KEY (research_id)
  REFERENCES public.research_history_new (research_id)
  ON DELETE CASCADE;

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_research_results_new_research_id ON public.research_results_new (research_id);

-- Update permissions if needed
ALTER TABLE public.research_results_new ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own results
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'research_results_new' AND policyname = 'Users can view their own results'
  ) THEN
    CREATE POLICY "Users can view their own results" 
      ON public.research_results_new FOR SELECT
      USING (user_id = auth.uid()::text);
  END IF;
END
$$; 
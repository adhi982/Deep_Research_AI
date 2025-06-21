-- SQL script to add notification_token column to user_profiles table
-- Run this in the Supabase SQL editor

-- Check if the user_profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    -- Check if the notification_token column already exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'notification_token'
    ) THEN
      -- Add notification_token column
      ALTER TABLE public.user_profiles 
      ADD COLUMN notification_token TEXT;
      
      -- Add comment to the column
      COMMENT ON COLUMN public.user_profiles.notification_token IS 'The push notification token for the user''s device';
    END IF;
  ELSE
    -- Create the user_profiles table if it doesn't exist
    CREATE TABLE public.user_profiles (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT,
      full_name TEXT,
      avatar_url TEXT,
      notification_token TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id)
    );
    
    -- Add comments
    COMMENT ON TABLE public.user_profiles IS 'User profile information';
    COMMENT ON COLUMN public.user_profiles.notification_token IS 'The push notification token for the user''s device';
    
    -- Set up RLS (Row Level Security)
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow users to see only their own profiles
    CREATE POLICY "Users can view their own profiles" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = user_id);
    
    -- Create policy to allow users to update only their own profiles
    CREATE POLICY "Users can update their own profiles" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = user_id);
    
    -- Create policy to allow users to insert only their own profiles
    CREATE POLICY "Users can insert their own profiles" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$; 
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wurrqztgdnecgtmsisrq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cnJxenRnZG5lY2d0bXNpc3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMjU5NTYsImV4cCI6MjA1ODgwMTk1Nn0.Cwke6VXDuTvQmaEgk-QKw_hwhQmrpNG_34l0gob_6NA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface ResearchHistory {
  research_id: string;
  user_id: string;
  agent: string;
  query: string;
  breadth: number;
  depth: number;
  include_technical_terms: boolean;
  output_format: string;
  status: string;
  created_at: string;
  completed_at?: string;
  is_public: boolean;
}

export interface ResearchQuestion {
  question_id: string;
  research_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered: boolean;
  reply_webhook_url: string;
  created_at: string;
}

export interface ResearchProgress {
  progress_id: string;
  research_id: string;
  user_id: string;
  status: string;
  topic: string;
  progress_percentage: number;
  created_at: string;
}

export interface ResearchResult {
  result_id: string;
  research_id: string;
  user_id: string;
  result: string;
  created_at: string;
}

export interface ResearchFeedback {
  feedback_id: string;
  research_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

// Enhanced Supabase client with specific functions for each table
export const supabaseClient = {
  // Auth functions
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Research History functions
  createResearchQuery: async (query: Omit<ResearchHistory, 'research_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('research_history_new')
      .insert(query)
      .select()
      .single();
    return { data, error };
  },

  getResearchHistory: async (userId: string) => {
    const { data, error } = await supabase
      .from('research_history_new')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Research Questions functions
  getUnansweredQuestions: async (researchId: string) => {
    const { data, error } = await supabase
      .from('research_questions')
      .select('*')
      .eq('research_id', researchId)
      .eq('answered', false);
    return { data, error };
  },

  submitAnswer: async (questionId: string, answer: string) => {
    const { data, error } = await supabase
      .from('research_questions')
      .update({ answer, answered: true })
      .eq('question_id', questionId)
      .select()
      .single();
    return { data, error };
  },

  // Research Progress functions
  getResearchProgress: async (researchId: string) => {
    const { data, error } = await supabase
      .from('research_progress')
      .select('*')
      .eq('research_id', researchId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Research Results functions
  getResearchResult: async (researchId: string) => {
    const { data, error } = await supabase
      .from('research_result_new')
      .select('*')
      .eq('research_id', researchId)
      .single();
    return { data, error };
  },

  // Research Feedback functions
  submitFeedback: async (feedback: Omit<ResearchFeedback, 'feedback_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('research_feedback')
      .insert(feedback)
      .select()
      .single();
    return { data, error };
  },

  // Realtime subscriptions
  subscribeToResearchProgress: (researchId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`research_progress_${researchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_progress',
          filter: `research_id=eq.${researchId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToResearchQuestions: (researchId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`research_questions_${researchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_questions',
          filter: `research_id=eq.${researchId}`,
        },
        callback
      )
      .subscribe();
  },

  // Add insertData method
  insertData: async (table: string, values: any) => {
    const { data, error } = await supabase
      .from(table)
      .insert(values)
      .select()
      .single();
    return { data, error };
  },
}; 
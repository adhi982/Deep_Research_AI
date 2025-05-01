import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Validate that required environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
}

// Log config status in development mode
if (__DEV__) {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Anon Key:', supabaseAnonKey);
}

// Update the interface to specify research_id as a string
export interface ResearchData {
  research_id: string;  // Client-generated ID
  user_id: string;
  agent: string;
  query: string;
  breadth: number;
  depth: number;
  include_technical_terms: boolean;
  output_format: string;
  status?: string;
  created_at?: string;
  completed_at?: string | null;
}

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public'
  }
});

// Generate a unique research ID (client-side)
export function generateResearchId(): string {
  return `research-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// Update the generateUserId function to use AsyncStorage
export async function generateUserId(): Promise<string> {
  try {
    // Try to get the user ID from AsyncStorage
    const storedId = await AsyncStorage.getItem('research_app_user_id');
    
    if (storedId) {
      console.log(`Using stored user ID: ${storedId}`);
      return storedId;
    }
    
    // If not found in AsyncStorage, generate a temporary one
    console.log('No stored user ID found, generating temporary ID');
    return `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  } catch (error) {
    console.error('Error retrieving user ID:', error);
    // Fallback to generating a temporary ID
    return `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
}

// Updated function to work with the new tables schema
export async function storeResearchHistory(data: ResearchData): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!data.research_id) {
    console.error('Research ID is required for storing research history');
    return { success: false, error: 'Missing research_id' };
  }

  try {
    console.log('Attempting to store research history with ID:', data.research_id);
    
    // 1. First try direct insert to the new table
    const { data: insertedData, error: insertError } = await supabase
      .from('research_history_new')
      .insert([data])
      .select();
    
    if (insertError) {
      console.log('Direct insert failed, attempting RPC function:', insertError.message);
      
      // 2. If direct insert fails, try using the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('insert_research_history', {
        p_research_id: data.research_id,
        p_user_id: data.user_id,
        p_agent: data.agent,
        p_query: data.query,
        p_breadth: data.breadth,
        p_depth: data.depth,
        p_include_technical_terms: data.include_technical_terms,
        p_output_format: data.output_format,
        p_status: data.status || 'pending',
        p_created_at: data.created_at || new Date().toISOString()
      });
      
      if (rpcError) {
        console.error('Both direct insert and RPC function failed:', rpcError.message);
        return { success: false, error: rpcError };
      }
      
      console.log('Successfully stored research history using RPC function');
      return { success: true, data: rpcData };
    }
    
    console.log('Successfully stored research history with direct insert');
    return { success: true, data: insertedData };
  } catch (error) {
    console.error('Unexpected error storing research history:', error);
    return { success: false, error };
  }
}

// Function to fetch research history for a user
export async function fetchResearchHistory(userId: string) {
  try {
    // Try to use the RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_research_history', { p_user_id: userId });
    
    if (rpcError) {
      console.error('Error fetching research history with RPC:', rpcError);
      
      // Fallback to direct query
      const { data: directData, error: directError } = await supabase
        .from('research_history_new')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (directError) {
        console.error('Error fetching research history with direct query:', directError);
        return [];
      }
      
      return directData;
    }
    
    return rpcData;
  } catch (error) {
    console.error('Unexpected error fetching research history:', error);
    return [];
  }
}

// Function to fetch research by ID
export async function fetchResearchById(researchId: string) {
  try {
    // Try to use the RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_research_by_id', { p_research_id: researchId });
    
    if (rpcError) {
      console.error('Error fetching research by ID with RPC:', rpcError);
      
      // Fallback to direct query
      const { data: directData, error: directError } = await supabase
        .from('research_history_new')
        .select('*')
        .eq('research_id', researchId)
        .single();
      
      if (directError) {
        console.error('Error fetching research by ID with direct query:', directError);
        return null;
      }
      
      return directData;
    }
    
    return rpcData;
  } catch (error) {
    console.error('Unexpected error fetching research by ID:', error);
    return null;
  }
}

// Function to store a research question
export async function storeResearchQuestion(questionData: {
  question_id: string;
  research_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered?: boolean;
  reply_webhook_url?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('research_questions_new')
      .insert([questionData])
      .select();
      
    if (error) {
      console.error('Error storing research question:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error storing research question:', error);
    return { success: false, error };
  }
}

// Function to store research progress
export async function storeResearchProgress(progressData: {
  progress_id: string;
  research_id: string;
  user_id: string;
  status: string;
  topic?: string;
  progress_percentage?: number;
}) {
  try {
    const { data, error } = await supabase
      .from('research_progress_new')
      .insert([progressData])
      .select();
      
    if (error) {
      console.error('Error storing research progress:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error storing research progress:', error);
    return { success: false, error };
  }
}

// Function to store research results
export async function storeResearchResult(resultData: {
  result_id: string;
  research_id: string;
  user_id: string;
  result: string;
}) {
  try {
    const { data, error } = await supabase
      .from('research_results_new')
      .insert([resultData])
      .select();
      
    if (error) {
      console.error('Error storing research result:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error storing research result:', error);
    return { success: false, error };
  }
}

// Function to generate IDs for various entities
export function generateEntityId(type: 'question' | 'progress' | 'result' | 'question-batch' | 'user'): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return !!session;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
};

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Helper function to sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export default supabase; 
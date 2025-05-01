import { storeResearchHistory, generateResearchId } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../../utils/config';

export interface ResearchQueryParams {
  user_id: string;
  agent: string;
  query: string;
  breadth: number;
  depth: number;
  include_technical_terms: boolean;
  output_format: string;
}

export interface ResearchQueryResponse {
  success: boolean;
  data?: any;
  error?: any;
  research_id?: string;
}

/**
 * Sends a research query to both the webhook (primary) and Supabase (secondary).
 * The function continues even if Supabase storage fails, as long as the webhook succeeds.
 */
export async function sendResearchQuery(params: ResearchQueryParams): Promise<ResearchQueryResponse> {
  try {
    // Check if we have a user_id parameter
    if (!params.user_id) {
      // Try to get from AsyncStorage as a fallback
      const storedUserId = await AsyncStorage.getItem('research_app_user_id');
      if (storedUserId) {
        console.log(`Retrieved stored user ID: ${storedUserId}`);
        params.user_id = storedUserId;
      } else {
        // Generate a temporary user ID as last resort
        params.user_id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        console.log(`Generated temporary user ID: ${params.user_id}`);
      }
    }

    // Generate a client-side research_id
    const research_id = generateResearchId();
    console.log(`Generated research_id: ${research_id}`);
    
    // Prepare the payload with the client-generated research_id
    const payload = {
      ...params,
      research_id,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    // 1. FIRST send the data to the webhook (primary system of record)
    console.log('Sending data to webhook...');
    const webhookUrl = config.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new Error('Webhook URL is not configured. Please check your environment variables.');
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
    
    const webhookResult = await response.json();
    console.log('Webhook response:', webhookResult);
    
    // 2. THEN store the data in Supabase (but continue even if this fails)
    console.log('Storing data in Supabase...');
    const supabaseResult = await storeResearchHistory(payload);
    
    if (!supabaseResult.success) {
      console.warn('Supabase storage failed, but continuing with app flow:', supabaseResult.error);
      
      // If RLS error is detected, log special message with SQL fix instructions
      if (typeof supabaseResult.error === 'string' && 
          (supabaseResult.error.includes('row-level security policy') || 
           supabaseResult.error.includes('RLS'))) {
        console.warn(`RLS policy issue detected. 
        Please run the SQL in test-supabase-fix.js to fix the database setup.`);
      }
    } else {
      console.log('Supabase storage successful');
    }
    
    // Return success as long as the webhook worked
    return {
      success: true,
      data: webhookResult,
      research_id,
    };
  } catch (error) {
    console.error('Error in sendResearchQuery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default sendResearchQuery; 
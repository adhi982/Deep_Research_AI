import { supabase, generateResearchId } from './supabase';
import { toast } from 'sonner-native';
import { cacheManager } from './cacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendResearchCompletionNotification } from './notificationService';

/**
 * Utility service for handling Research Progress functions
 */

// Cache keys
const CACHE_KEYS = {
  RESEARCH_HISTORY: 'research_history_',
  RESEARCH_ITEM: 'research_item_',
  USER_HISTORY: 'user_history_',
  ACTIVE_QUEUE: 'active_queue_',
  RESEARCH_RESULTS: 'research_results_'
};

// Cache TTL values (in milliseconds)
const CACHE_TTL = {
  RESEARCH_HISTORY: 5 * 60 * 1000, // 5 minutes
  RESEARCH_ITEM: 10 * 60 * 1000, // 10 minutes
  USER_HISTORY: 2 * 60 * 1000, // 2 minutes
  ACTIVE_QUEUE: 2 * 60 * 1000, // 2 minutes
  RESEARCH_RESULTS: 5 * 60 * 1000 // 5 minutes
};

/**
 * Fetch research history for a user with caching
 * 
 * @param userId The user ID to fetch research history for
 * @param options Optional parameters for caching behavior
 * @returns Research history array
 */
export async function fetchResearchHistoryWithCache(
  userId: string, 
  options = { forceRefresh: false, background: true }
) {
  const cacheKey = `${CACHE_KEYS.USER_HISTORY}${userId}`;
  
  return cacheManager.getOrFetch(
    cacheKey,
    () => fetchResearchHistoryFromApi(userId),
    { 
      ttl: CACHE_TTL.RESEARCH_HISTORY,
      forceRefresh: options.forceRefresh,
      background: options.background 
    }
  );
}

/**
 * Fetch research by ID with caching
 * 
 * @param researchId The research ID to fetch
 * @param options Optional parameters for caching behavior
 * @returns Research item or null if not found
 */
export async function fetchResearchByIdWithCache(
  researchId: string,
  options = { forceRefresh: false }
) {
  const cacheKey = `${CACHE_KEYS.RESEARCH_ITEM}${researchId}`;
  
  return cacheManager.getOrFetch(
    cacheKey,
    () => fetchResearchByIdFromApi(researchId),
    { 
      ttl: CACHE_TTL.RESEARCH_ITEM,
      forceRefresh: options.forceRefresh 
    }
  );
}

/**
 * Fetch research results by ID with caching
 * 
 * @param researchId The research ID to fetch results for
 * @param options Optional parameters for caching behavior
 * @returns Research results or null if not found
 */
export async function fetchResearchResultWithCache(
  researchId: string,
  options = { forceRefresh: false }
) {
  const cacheKey = `${CACHE_KEYS.RESEARCH_RESULTS}${researchId}`;
  
  return cacheManager.getOrFetch(
    cacheKey,
    () => fetchResearchResultFromApi(researchId),
    { 
      ttl: CACHE_TTL.RESEARCH_RESULTS,
      forceRefresh: options.forceRefresh 
    }
  );
}

/**
 * Internal function to fetch research results from API
 */
async function fetchResearchResultFromApi(researchId: string) {
  try {
    console.log('ResearchService: Fetching research results from API:', researchId);
    
    const { data, error } = await supabase
      .from('research_results_new')
      .select('*')
      .eq('research_id', researchId)
      .order('created_at', { ascending: false })
      .maybeSingle();
    
    if (error) {
      console.error('ResearchService: Error fetching research results:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('ResearchService: Unexpected error fetching research results:', error);
    return null;
  }
}

/**
 * Internal function to fetch research history from API
 */
async function fetchResearchHistoryFromApi(userId: string) {
  try {
    console.log('ResearchService: Fetching research history from API for user:', userId);
    
    // Try to use the RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_research_history', { p_user_id: userId });
    
    if (rpcError) {
      console.error('ResearchService: Error fetching research history with RPC:', rpcError);
      
      // Fallback to direct query
      const { data: directData, error: directError } = await supabase
        .from('research_history_new')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (directError) {
        console.error('ResearchService: Error fetching research history with direct query:', directError);
        return [];
      }
      
      return directData;
    }
    
    return rpcData;
  } catch (error) {
    console.error('ResearchService: Unexpected error fetching research history:', error);
    return [];
  }
}

/**
 * Internal function to fetch research by ID from API
 */
async function fetchResearchByIdFromApi(researchId: string) {
  try {
    console.log('ResearchService: Fetching research by ID from API:', researchId);
    
    // Try to use the RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_research_by_id', { p_research_id: researchId });
    
    if (rpcError) {
      console.error('ResearchService: Error fetching research by ID with RPC:', rpcError);
      
      // Fallback to direct query
      const { data: directData, error: directError } = await supabase
        .from('research_history_new')
        .select('*')
        .eq('research_id', researchId)
        .single();
      
      if (directError) {
        console.error('ResearchService: Error fetching research by ID with direct query:', directError);
        return null;
      }
      
      return directData;
    }
    
    return rpcData;
  } catch (error) {
    console.error('ResearchService: Unexpected error fetching research by ID:', error);
    return null;
  }
}

/**
 * Clear research-related cache when needed
 * (e.g., after creating, updating, or deleting research)
 */
export async function clearResearchCache(userId?: string, researchId?: string) {
  try {
    if (researchId) {
      // Clear specific research item cache
      await cacheManager.remove(`${CACHE_KEYS.RESEARCH_ITEM}${researchId}`);
    }
    
    if (userId) {
      // Clear user history cache
      await cacheManager.remove(`${CACHE_KEYS.USER_HISTORY}${userId}`);
    }
    
    if (!userId && !researchId) {
      // Clear all research caches if no specific item
      await cacheManager.clearByPrefix(CACHE_KEYS.RESEARCH_HISTORY);
      await cacheManager.clearByPrefix(CACHE_KEYS.RESEARCH_ITEM);
      await cacheManager.clearByPrefix(CACHE_KEYS.USER_HISTORY);
    }
  } catch (error) {
    console.error('ResearchService: Error clearing research cache:', error);
  }
}

/**
 * Store research history with cache invalidation
 * Handles both API storage and optimistic cache updates
 */
export async function storeResearchHistoryWithCache(data: any): Promise<{ success: boolean, data?: any, error?: any }> {
  try {
    // Check if we can do optimistic updates for this user
    const userId = data.user_id;
    if (userId) {
      console.log('ResearchService: Attempting optimistic update for new research item');
      
      // First update the cache optimistically
      const optimisticData = {
        ...data,
        created_at: data.created_at || new Date().toISOString()
      };
      
      // Add to cached history immediately (don't await to prevent blocking UI)
      updateCachedHistory(userId, optimisticData)
        .then(success => {
          if (success) {
            console.log('ResearchService: Applied optimistic update to history cache');
          }
        })
        .catch(error => {
          console.error('ResearchService: Error during optimistic update:', error);
        });
    }
    
    // Then store in database (actual API call)
    const result = await storeResearchHistoryInApi(data);
    
    // If API call failed but we did an optimistic update, we should reverse it
    if (!result.success && userId) {
      console.log('ResearchService: API storage failed, will refresh cache to correct optimistic update');
      // Clear cache to force a refresh next time (instead of having incorrect data)
      await clearResearchCache(userId, data.research_id);
    }
    
    return result;
  } catch (error) {
    console.error('ResearchService: Error storing research history with cache:', error);
    return { success: false, error };
  }
}

/**
 * Internal function to store research history in API
 */
async function storeResearchHistoryInApi(data: any) {
  try {
    console.log('ResearchService: Storing research history in API:', data.research_id);
    
    if (!data.research_id) {
      console.error('ResearchService: Research ID is required for storing research history');
      return { success: false, error: 'Missing research_id' };
    }

    // 1. First try direct insert to the new table
    const { data: insertedData, error: insertError } = await supabase
      .from('research_history_new')
      .insert([data])
      .select();
    
    if (insertError) {
      console.log('ResearchService: Direct insert failed, attempting RPC function:', insertError.message);
      
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
        console.error('ResearchService: Both direct insert and RPC function failed:', rpcError.message);
        return { success: false, error: rpcError };
      }
      
      console.log('ResearchService: Successfully stored research history using RPC function');
      // Create a response object with the same structure as the insert response for consistency
      const responseData = {
        research_id: data.research_id,
        user_id: data.user_id,
        query: data.query,
        agent: data.agent,
        status: data.status || 'pending',
        created_at: data.created_at || new Date().toISOString()
      };
      return { success: true, data: responseData };
    }
    
    console.log('ResearchService: Successfully stored research history with direct insert');
    return { success: true, data: insertedData[0] };
  } catch (error) {
    console.error('ResearchService: Unexpected error storing research history:', error);
    return { success: false, error };
  }
}

// Check if research is complete based on progress criteria
export const checkResearchCompletion = async (researchId: string): Promise<boolean> => {
  try {
    // Get research history to check parameters
    const { data: historyData, error: historyError } = await supabase
      .from('research_history_new')
      .select('*')
      .eq('research_id', researchId)
      .single();
    
    if (historyError) {
      console.error('Error checking research history:', historyError);
      return false;
    }
    
    if (!historyData) {
      console.log(`Research ${researchId} not found in history`);
      return false;
    }
    
    // If research is already marked as completed in history, return true
    if (historyData.status === 'completed') {
      console.log(`Research ${researchId} already marked as completed in history`);
      return true;
    }
    
    // Get progress topics
    const { data: progressData, error: progressError } = await supabase
      .from('research_progress_new')
      .select('topic')
      .eq('research_id', researchId)
      .order('created_at', { ascending: false });
    
    if (progressError) {
      console.error('Error checking research progress:', progressError);
      return false;
    }
    
    // Check if there's already a completion topic
    const hasCompletionTopic = progressData?.some(item => 
      item.topic && typeof item.topic === 'string' && 
      item.topic.toLowerCase().includes('research_done')
    );
    
    if (hasCompletionTopic) {
      console.log(`Research ${researchId} already has completion topic`);
      return true;
    }
    
    // Calculate expected topics based on breadth and depth using the formula (Breadth × Depth) + 3
    // +3 accounts for: 1) firing the research topic, 2) preparing the final draft, 3) ready state
    const totalSerpQueries = historyData.breadth * historyData.depth;
    const expectedTopics = totalSerpQueries + 3;
    
    // Check if we have enough topics to consider it complete (at least 85% of expected)
    const completionThreshold = Math.floor(expectedTopics * 0.85);
    const hasEnoughTopics = progressData && progressData.length >= completionThreshold;
    
    // Check for results data as an additional completion indicator
    const { data: resultsData, error: resultsError } = await supabase
      .from('research_results_new')
      .select('result_id')
      .eq('research_id', researchId)
      .limit(1);
    
    if (resultsError) {
      console.error('Error checking research results:', resultsError);
    }
    
    const hasResults = !resultsError && resultsData && resultsData.length > 0;
    
    // Log the completion check details
    console.log(`Research ${researchId} completion check:`, {
      topicsCount: progressData?.length || 0,
      expectedTopics,
      completionThreshold,
      hasEnoughTopics,
      hasResults
    });
    
    // Research is complete if it has enough topics OR if results are available
    return hasEnoughTopics || hasResults;
  } catch (error) {
    console.error('Error in checkResearchCompletion:', error);
    return false;
  }
};

// Create a final "research_done" topic to mark completion
export const markResearchAsComplete = async (
  researchId: string, 
  userId: string
): Promise<boolean> => {
  try {
    // First, check if the research is already marked as complete in research_history_new
    const { data: historyData, error: historyError } = await supabase
      .from('research_history_new')
      .select('status, query')  // Added query to use for notification
      .eq('research_id', researchId)
      .single();
      
    if (historyError) {
      console.error('Error checking research history status:', historyError);
      return false;
    }
    
    // If research is already marked as completed at the history level, no need to add another completion topic
    if (historyData?.status === 'completed') {
      console.log('Research already marked as completed in history. Skipping duplicate completion entry.');
      return true;
    }
    
    // Check if there's already a completion topic by querying with an exact match and case insensitivity
    const { data: existingData, error: existingError } = await supabase
      .from('research_progress_new')
      .select('progress_id, topic')
      .eq('research_id', researchId)
      .ilike('topic', '%research_done%')
      .order('created_at', { ascending: false });
    
    if (existingError) {
      console.error('Error checking for existing completion topics:', existingError);
      return false;
    }
    
    // If any completion topics already exist, don't create another
    if (existingData && existingData.length > 0) {
      console.log(`Found ${existingData.length} existing completion topics. Skipping duplicate.`);
      // Update research history status if it hasn't been updated
      await supabase
        .from('research_history_new')
        .update({ status: 'completed' })
        .eq('research_id', researchId);
      return true;
    }
    
    // Create a completion ID that's compatible with the table
    const completionId = `topic-${Date.now()}-done`;
    
    // Use a more descriptive topic name
    const completionTopic = 'Research Complete research_done';
    
    console.log(`Creating completion topic for research ${researchId}: "${completionTopic}"`);
    
    // Insert the completion topic
    const { error: insertError } = await supabase
      .from('research_progress_new')
      .insert({
        progress_id: completionId,
        research_id: researchId,
        user_id: userId,
        topic: completionTopic,
        links: [
          { 
            url: '#summary', 
            title: 'Research Summary Available' 
          }
        ],
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error marking research as complete:', insertError);
      return false;
    }
    
    console.log(`Successfully added completion topic for research ${researchId}`);
    
    // Update the research history status
    const { error: updateError } = await supabase
      .from('research_history_new')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('research_id', researchId);
    
    if (updateError) {
      console.error('Error updating research history status:', updateError);
    } else {
      console.log(`Successfully updated research history status to 'completed' for ${researchId}`);
      
      // Update cached history status for immediate UI feedback
      updateCachedHistoryStatus(userId, researchId, 'completed')
        .then(success => {
          if (success) {
            console.log('Successfully updated cached history status to completed');
          }
        })
        .catch(error => {
          console.error('Error updating cached history status:', error);
        });
        
      // Send a push notification for research completion
      if (historyData?.query) {
        console.log('Sending research completion notification');
        sendResearchCompletionNotification(researchId, historyData.query)
          .catch(notificationError => {
            console.error('Error sending research completion notification:', notificationError);
          });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in markResearchAsComplete:', error);
    return false;
  }
};

// Monitor research progress and mark as complete when criteria met
export const monitorResearchProgress = async (
  researchId: string, 
  userId: string
): Promise<void> => {
  try {
    // First check if research is already marked as complete in history
    const { data: historyData, error: historyError } = await supabase
      .from('research_history_new')
      .select('status')
      .eq('research_id', researchId)
      .single();
    
    if (historyError) {
      console.error('Error checking research history status:', historyError);
      return;
    }
    
    // If already completed, don't do any further processing
    if (historyData?.status === 'completed') {
      console.log(`Research ${researchId} already completed. Skipping monitoring.`);
      return;
    }
    
    // Check if there are already completion topics
    const { data: existingTopics, error: topicsError } = await supabase
      .from('research_progress_new')
      .select('progress_id')
      .eq('research_id', researchId)
      .ilike('topic', '%research_done%')
      .limit(1);
    
    if (topicsError) {
      console.error('Error checking existing completion topics:', topicsError);
      return;
    }
    
    // If a completion topic already exists, don't create a new one
    if (existingTopics && existingTopics.length > 0) {
      console.log(`Research ${researchId} already has completion topic. Just updating history status.`);
      // Ensure history status is updated
      await supabase
        .from('research_history_new')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('research_id', researchId);
      return;
    }
    
    // If no completion topic exists, check if it should be complete
    const isComplete = await checkResearchCompletion(researchId);
    
    if (isComplete) {
      console.log(`Research ${researchId} meets completion criteria. Marking as complete...`);
      const marked = await markResearchAsComplete(researchId, userId);
      
      if (marked) {
        console.log(`Research ${researchId} successfully marked as complete.`);
      } else {
        console.log(`Failed to mark research ${researchId} as complete.`);
      }
    } else {
      console.log(`Research ${researchId} does not yet meet completion criteria.`);
    }
  } catch (error) {
    console.error('Error monitoring research progress:', error);
  }
};

// Manually trigger research completion
export const completeResearch = async (
  researchId: string, 
  userId: string
): Promise<boolean> => {
  try {
    const marked = await markResearchAsComplete(researchId, userId);
    
    if (marked) {
      toast.success('Research has been marked as complete!');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error completing research:', error);
    return false;
  }
};

// Clean up debug topics for a specific research
export const cleanupDebugTopics = async (researchId: string): Promise<boolean> => {
  try {
    console.log(`Cleaning up debug topics for research ${researchId}`);
    
    // Find all debug topics for this research
    const { data: debugTopics, error: findError } = await supabase
      .from('research_progress_new')
      .select('progress_id, topic')
      .eq('research_id', researchId)
      .or(`topic.ilike.%Debug Topic%,topic.ilike.%test%`)
      .order('created_at', { ascending: false });
    
    if (findError) {
      console.error('Error finding debug topics:', findError);
      return false;
    }
    
    if (!debugTopics || debugTopics.length === 0) {
      console.log(`No debug topics found for research ${researchId}`);
      return true;
    }
    
    console.log(`Found ${debugTopics.length} debug topics to clean up for research ${researchId}`);
    
    // Extract just the progress_ids
    const debugTopicIds = debugTopics.map(topic => topic.progress_id);
    
    // Delete all debug topics in a single operation
    const { error: deleteError } = await supabase
      .from('research_progress_new')
      .delete()
      .in('progress_id', debugTopicIds);
    
    if (deleteError) {
      console.error('Error deleting debug topics:', deleteError);
      return false;
    }
    
    console.log(`Successfully deleted ${debugTopicIds.length} debug topics for research ${researchId}`);
    return true;
  } catch (error) {
    console.error('Error cleaning up debug topics:', error);
    return false;
  }
};

// Submit feedback for a research
export const submitFeedback = async (
  researchId: string,
  rating: number,
  comment?: string
): Promise<boolean> => {
  try {
    // Validate input parameters
    if (!researchId) {
      console.error('Invalid researchId: researchId is required');
      toast.error('Missing research information');
      return false;
    }
    
    // Validate rating is between 1-5
    if (!rating || rating < 1 || rating > 5) {
      console.error(`Invalid rating: ${rating}. Must be between 1 and 5`);
      toast.error('Please provide a valid rating (1-5)');
      return false;
    }
    
    // Generate a unique feedback ID
    const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    console.log(`Submitting feedback for research ${researchId}, rating: ${rating}, comment: ${comment || 'none'}`);
    
    // Prepare the feedback data
    const feedbackData = {
      feedback_id: feedbackId,
      research_id: researchId,
      rating,
      comment: comment || null,
      created_at: new Date().toISOString()
      // user_id is left null as requested
    };
    
    console.log('Feedback data to insert:', JSON.stringify(feedbackData));
    
    // Try to insert feedback
    try {
      const { data, error } = await supabase
        .from('research_feedback')
        .insert(feedbackData)
        .select();
      
      if (error) {
        console.error('Error submitting feedback:', error);
        
        // If it's a foreign key constraint error, try using the RPC function
        if (error.message && error.message.includes('foreign key constraint')) {
          console.log('Foreign key constraint error. Trying RPC function.');
          
          const { data: rpcData, error: rpcError } = await supabase.rpc('submit_research_feedback', {
            p_feedback_id: feedbackId,
            p_research_id: researchId,
            p_user_id: null,
            p_rating: rating,
            p_comment: comment || null,
            p_created_at: new Date().toISOString()
          });
          
          if (rpcError) {
            console.error('Error submitting feedback via RPC:', rpcError);
            toast.error(`Failed to submit feedback: ${rpcError.message}`);
            return false;
          }
          
          console.log('Successfully submitted feedback via RPC function');
          toast.success('Thank you for your feedback!');
          return true;
        }
        
        toast.error(`Failed to submit feedback: ${error.message}`);
        return false;
      }
      
      // Check if data was actually inserted
      if (!data || data.length === 0) {
        console.error('No feedback data returned after insert');
        toast.error('Failed to save feedback');
        return false;
      }
      
      console.log(`Successfully submitted feedback with ID: ${feedbackId}`, data);
      toast.success('Thank you for your feedback!');
      return true;
    } catch (mainError) {
      console.error('Critical error in feedback submission:', mainError);
      toast.error('Unable to save your feedback at this time');
      return false;
    }
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    toast.error('An unexpected error occurred');
    return false;
  }
};

// Check if feedback has already been submitted for a research
export const checkFeedbackSubmitted = async (researchId: string): Promise<boolean> => {
  try {
    console.log(`Checking if feedback exists for research ${researchId}`);
    
    const { data, error, count } = await supabase
      .from('research_feedback')
      .select('*', { count: 'exact' })
      .eq('research_id', researchId)
      .limit(1);
    
    if (error) {
      console.error('Error checking feedback submission:', error);
      return false;
    }
    
    const hasSubmitted = count !== null && count > 0;
    console.log(`Feedback submission check for ${researchId}: ${hasSubmitted ? 'Already submitted' : 'Not submitted yet'}`);
    
    return hasSubmitted;
  } catch (error) {
    console.error('Error in checkFeedbackSubmitted:', error);
    return false;
  }
};

/**
 * Update the cached history data when a new research is added
 * This allows for optimistic updates without waiting for server refresh
 * 
 * @param userId The user ID whose history to update
 * @param newItem The new research item to add to the history
 * @returns Boolean indicating success
 */
export async function updateCachedHistory(userId: string, newItem: any): Promise<boolean> {
  try {
    console.log('ResearchService: Updating cached history with new item:', newItem.research_id);
    
    const cacheKey = `${CACHE_KEYS.USER_HISTORY}${userId}`;
    
    // Get current cached data
    const cachedValue = await AsyncStorage.getItem(cacheKey);
    if (!cachedValue) {
      console.log('ResearchService: No cached history to update');
      return false;
    }
    
    // Parse and update the cached data
    try {
      const { data: currentHistory, cachedAt, expiry } = JSON.parse(cachedValue);
      
      // Add the new item at the beginning of the array
      const updatedHistory = [newItem, ...currentHistory];
      
      // Save the updated cache
      const cacheObject = {
        data: updatedHistory,
        cachedAt, // Keep the original cache timestamp
        expiry    // Keep the original expiry
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheObject));
      console.log('ResearchService: Successfully updated cached history optimistically');
      return true;
    } catch (error) {
      console.error('ResearchService: Error parsing or updating cached history:', error);
      return false;
    }
  } catch (error) {
    console.error('ResearchService: Error updating cached history:', error);
    return false;
  }
}

/**
 * Update the status of a research item in the cached history
 * Used for optimistic updates to show status changes immediately
 * 
 * @param userId The user ID whose history to update
 * @param researchId The research ID to update
 * @param status The new status to set
 * @returns Boolean indicating success
 */
export async function updateCachedHistoryStatus(
  userId: string, 
  researchId: string, 
  status: string
): Promise<boolean> {
  try {
    console.log(`ResearchService: Updating cached history status for research ${researchId} to ${status}`);
    
    const cacheKey = `${CACHE_KEYS.USER_HISTORY}${userId}`;
    
    // Get current cached data
    const cachedValue = await AsyncStorage.getItem(cacheKey);
    if (!cachedValue) {
      console.log('ResearchService: No cached history to update status');
      return false;
    }
    
    // Parse and update the cached data
    try {
      const { data: currentHistory, cachedAt, expiry } = JSON.parse(cachedValue);
      
      // Find and update the item status
      const updatedHistory = currentHistory.map((item: any) => {
        if (item.research_id === researchId) {
          return { ...item, status };
        }
        return item;
      });
      
      // Save the updated cache
      const cacheObject = {
        data: updatedHistory,
        cachedAt, // Keep the original cache timestamp
        expiry    // Keep the original expiry
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheObject));
      console.log('ResearchService: Successfully updated cached history status');
      return true;
    } catch (error) {
      console.error('ResearchService: Error parsing or updating cached history status:', error);
      return false;
    }
  } catch (error) {
    console.error('ResearchService: Error updating cached history status:', error);
    return false;
  }
}

/**
 * Fetch active queue (pending research) with caching
 * 
 * @param userId The user ID to fetch active queue for
 * @param options Optional parameters for caching behavior
 * @returns Array of active research items
 */
export async function fetchActiveQueueWithCache(
  userId: string,
  options = { forceRefresh: false, background: true }
) {
  const cacheKey = `${CACHE_KEYS.ACTIVE_QUEUE}${userId}`;
  
  return cacheManager.getOrFetch(
    cacheKey,
    () => fetchActiveQueueFromApi(userId),
    { 
      ttl: CACHE_TTL.ACTIVE_QUEUE,
      forceRefresh: options.forceRefresh,
      background: options.background 
    }
  );
}

/**
 * Internal function to fetch active queue from API
 */
async function fetchActiveQueueFromApi(userId: string) {
  try {
    console.log('ResearchService: Fetching active queue from API for user:', userId);
    
    // Query items that are pending or in progress
    const { data, error } = await supabase
      .from('research_history_new')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('ResearchService: Error fetching active queue:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('ResearchService: Unexpected error fetching active queue:', error);
    return [];
  }
}

/**
 * Check if an item has research results
 */
async function checkForResults(researchId: string) {
  try {
    const { count, error } = await supabase
      .from('research_results_new')
      .select('*', { count: 'exact', head: true })
      .eq('research_id', researchId);
      
    return { hasResults: count && count > 0, error };
  } catch (error) {
    console.error('ResearchService: Error checking for results:', error);
    return { hasResults: false, error };
  }
}

/**
 * Update active queue cache with new item or status
 * 
 * @param userId User ID for cache key
 * @param updatedItem Item to update or add to cache
 */
export async function updateActiveQueueCache(
  userId: string,
  updatedItem: any
): Promise<boolean> {
  try {
    const cacheKey = `${CACHE_KEYS.ACTIVE_QUEUE}${userId}`;
    
    // Get current cached queue
    const cachedValue = await AsyncStorage.getItem(cacheKey);
    const now = new Date().getTime();
    
    if (!cachedValue) {
      // No cache exists yet, create a new one with just this item
      if (updatedItem.status === 'completed') {
        // No need to cache completed items
        return false;
      }
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: [updatedItem],
        cachedAt: now,
        expiry: now + CACHE_TTL.ACTIVE_QUEUE
      }));
      
      return true;
    }
    
    // Parse existing cache
    const { data: queue, cachedAt, expiry } = JSON.parse(cachedValue);
    
    // Handle item removal if status is 'completed'
    if (updatedItem.status === 'completed') {
      const updatedQueue = queue.filter((item: any) => 
        item.research_id !== updatedItem.research_id
      );
      
      // Save updated queue
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: updatedQueue,
        cachedAt,
        expiry
      }));
      
      return true;
    }
    
    // Find if item exists in cache
    const existingIndex = queue.findIndex((item: any) => 
      item.research_id === updatedItem.research_id
    );
    
    let updatedQueue = [...queue];
    
    if (existingIndex >= 0) {
      // Update existing item
      updatedQueue[existingIndex] = {
        ...updatedQueue[existingIndex],
        ...updatedItem
      };
    } else {
      // Add new item at the beginning (most recent)
      updatedQueue = [updatedItem, ...updatedQueue];
    }
    
    // Save updated queue
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      data: updatedQueue,
      cachedAt,
      expiry
    }));
    
    return true;
  } catch (error) {
    console.error('ResearchService: Error updating active queue cache:', error);
    return false;
  }
}

/**
 * Clear active queue cache
 * 
 * @param userId Optional user ID to clear cache for specific user
 */
export async function clearActiveQueueCache(userId?: string) {
  try {
    if (userId) {
      // Clear specific user's active queue cache
      await cacheManager.remove(`${CACHE_KEYS.ACTIVE_QUEUE}${userId}`);
    } else {
      // Clear all active queue caches
      await cacheManager.clearByPrefix(CACHE_KEYS.ACTIVE_QUEUE);
    }
  } catch (error) {
    console.error('ResearchService: Error clearing active queue cache:', error);
  }
}

/**
 * Fetch research results for a user with caching
 * 
 * @param userId The user ID to fetch results for
 * @param options Optional parameters for caching behavior
 * @returns Research results mapping
 */
export async function fetchResearchResultsWithCache(
  userId: string,
  options = { forceRefresh: false, background: true }
) {
  const cacheKey = `${CACHE_KEYS.RESEARCH_RESULTS}${userId}`;
  
  return cacheManager.getOrFetch(
    cacheKey,
    () => fetchResearchResultsFromApi(userId),
    {
      ttl: CACHE_TTL.RESEARCH_RESULTS,
      forceRefresh: options.forceRefresh,
      background: options.background
    }
  );
}

/**
 * Internal function to fetch research results from API
 */
async function fetchResearchResultsFromApi(userId: string) {
  try {
    console.log('ResearchService: Fetching research results from API for user:', userId);
    
    const { data, error } = await supabase
      .from('research_results_new')
      .select('research_id')
      .eq('user_id', userId);
      
    if (error) {
      console.error('ResearchService: Error fetching research results:', error);
      return {};
    }
    
    // Convert to map for quick lookups
    const resultsMap: {[key: string]: boolean} = {};
    data.forEach(result => {
      resultsMap[result.research_id] = true;
    });
    
    return resultsMap;
  } catch (error) {
    console.error('ResearchService: Unexpected error fetching research results:', error);
    return {};
  }
}

/**
 * Update research results cache
 * 
 * @param userId User ID for cache key
 * @param researchId Research ID to mark as having results
 */
export async function updateResearchResultsCache(
  userId: string,
  researchId: string
): Promise<boolean> {
  try {
    const cacheKey = `${CACHE_KEYS.RESEARCH_RESULTS}${userId}`;
    
    // Get current cached results
    const cachedValue = await AsyncStorage.getItem(cacheKey);
    const now = new Date().getTime();
    
    if (!cachedValue) {
      // No cache exists yet, create a new one with just this result
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: { [researchId]: true },
        cachedAt: now,
        expiry: now + CACHE_TTL.RESEARCH_RESULTS
      }));
      
      return true;
    }
    
    // Parse existing cache
    const { data: resultsMap, cachedAt, expiry } = JSON.parse(cachedValue);
    
    // Update results map
    const updatedResultsMap = {
      ...resultsMap,
      [researchId]: true
    };
    
    // Save updated results
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      data: updatedResultsMap,
      cachedAt,
      expiry
    }));
    
    return true;
  } catch (error) {
    console.error('ResearchService: Error updating research results cache:', error);
    return false;
  }
}

/**
 * Clear research results cache
 * 
 * @param userId Optional user ID to clear cache for specific user
 */
export async function clearResearchResultsCache(userId?: string) {
  try {
    if (userId) {
      // Clear specific user's research results cache
      await cacheManager.remove(`${CACHE_KEYS.RESEARCH_RESULTS}${userId}`);
    } else {
      // Clear all research results caches
      await cacheManager.clearByPrefix(CACHE_KEYS.RESEARCH_RESULTS);
    }
  } catch (error) {
    console.error('ResearchService: Error clearing research results cache:', error);
  }
} 
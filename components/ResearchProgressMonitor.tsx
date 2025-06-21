import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabase';
import { monitorResearchProgress } from '../utils/researchService';

/**
 * Component that monitors research progress in the background
 * and marks it as complete when needed
 */
interface ResearchProgressMonitorProps {
  researchId: string;
  userId: string;
  onComplete?: () => void;
}

const ResearchProgressMonitor: React.FC<ResearchProgressMonitorProps> = ({ 
  researchId, 
  userId,
  onComplete 
}) => {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [hasCompletionTopic, setHasCompletionTopic] = useState(false);
  
  // Check if research already has a completion topic
  useEffect(() => {
    if (!researchId) return;
    
    const checkExistingCompletionTopic = async () => {
      try {
        const { data, error } = await supabase
          .from('research_progress_new')
          .select('topic')
          .eq('research_id', researchId)
          .ilike('topic', '%research_done%')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`Research ${researchId} already has completion topic. Stopping monitor.`);
          setHasCompletionTopic(true);
          setIsMonitoring(false);
          if (onComplete) onComplete();
        }
      } catch (error) {
        console.error('Error checking for existing completion topic:', error);
      }
    };
    
    checkExistingCompletionTopic();
  }, [researchId]);
  
  // Set up monitoring interval - only if no completion topic was found
  useEffect(() => {
    if (!researchId || !userId || hasCompletionTopic || !isMonitoring) return;
    
    console.log(`Starting progress monitor for research ${researchId}`);
    
    // Initial check with a delay to avoid immediate duplicates
    const initialCheckTimeout = setTimeout(() => {
      monitorResearchProgress(researchId, userId)
        .catch(error => {
          console.error('Error in initial research monitoring:', error);
        });
    }, 5000); // 5 second delay for initial check
    
    // Set up interval for regular checks - less frequent to reduce duplicate issue
    const intervalId = setInterval(() => {
      if (!isMonitoring) {
        console.log(`Monitor for ${researchId} is paused. Skipping check.`);
        return;
      }
      
      console.log(`Performing scheduled check for research ${researchId}`);
      
      // Check if research is now complete
      supabase
        .from('research_progress_new')
        .select('topic')
        .eq('research_id', researchId)
        .ilike('topic', '%research_done%')
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            console.log(`Found completion topic for ${researchId}. Stopping monitor.`);
            setHasCompletionTopic(true);
            setIsMonitoring(false);
            if (onComplete) onComplete();
            return;
          }
          
          // Only call monitorResearchProgress if no completion topic was found
          return monitorResearchProgress(researchId, userId);
        })
        .catch(error => {
          console.error('Error in research monitoring interval:', error);
        });
    }, 60000); // Check every 60 seconds instead of 30 to reduce chances of duplicate checks
    
    // Clean up
    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
    };
  }, [researchId, userId, isMonitoring, hasCompletionTopic]);
  
  // Set up Supabase subscription for real-time updates - to avoid missing updates between interval checks
  useEffect(() => {
    if (!researchId || !userId || hasCompletionTopic || !isMonitoring) return;
    
    console.log(`Setting up real-time subscription for research ${researchId} progress`);
    
    const subscription = supabase
      .channel(`progress-monitor-${researchId}`) // Unique channel name
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'research_progress_new',
        filter: `research_id=eq.${researchId}`
      }, payload => {
        // Only process if we're still monitoring
        if (!isMonitoring) return;
        
        console.log(`Real-time update for research ${researchId}:`, payload);
        
        // Check if this new topic is a completion topic
        if (payload.new && 
            payload.new.topic && 
            typeof payload.new.topic === 'string' &&
            payload.new.topic.toLowerCase().includes('research_done')) {
          console.log(`Received completion topic for ${researchId}. Stopping monitor.`);
          setHasCompletionTopic(true);
          setIsMonitoring(false);
          if (onComplete) onComplete();
          return;
        }
        
        // If not a completion topic, just monitor progress without adding a completion topic
        // This reduces the chance of creating duplicate completion topics
      })
      .subscribe((status) => {
        console.log(`Subscription status for ${researchId}:`, status);
      });
    
    // Clean up
    return () => {
      console.log(`Cleaning up subscription for research ${researchId}`);
      supabase.removeChannel(subscription);
    };
  }, [researchId, userId, isMonitoring, hasCompletionTopic]);
  
  // This is an invisible component - it doesn't render anything
  return null;
};

export default ResearchProgressMonitor; 
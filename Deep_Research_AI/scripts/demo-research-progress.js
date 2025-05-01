/**
 * Demo script for Research Progress features
 * This demonstrates how to create sample research topics and
 * mark research as complete programmatically
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Webhook URL for notifications
const WEBHOOK_URL = 'https://atomic123.app.n8n.cloud/webhook-test/055cedaa-a313-4625-a41c-7e7f9560b7a3';

// Generate unique IDs for testing
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// Create a research history entry
async function createResearchHistory(researchId, userId) {
  console.log(`Creating research history entry for ID: ${researchId}`);
  
  try {
    const { data, error } = await supabase
      .from('research_history_new')
      .insert({
        research_id: researchId,
        user_id: userId,
        agent: 'general',
        query: 'Demo Research Query',
        breadth: 3,
        depth: 3,
        include_technical_terms: true,
        output_format: 'Research Paper',
        status: 'in_progress',
        created_at: new Date().toISOString()
      })
      .select();
      
    if (error) {
      console.error('Error creating research history:', error);
      return false;
    }
    
    console.log('Research history created successfully');
    return true;
  } catch (err) {
    console.error('Unexpected error creating research history:', err);
    return false;
  }
}

// Create a research progress topic
async function createTopic(researchId, userId, topicName, links = []) {
  console.log(`Creating topic: ${topicName}`);
  
  try {
    const topicId = generateId('topic');
    
    const { error } = await supabase
      .from('research_progress_new')
      .insert({
        progress_id: topicId,
        research_id: researchId,
        user_id: userId,
        topic: topicName,
        links: links,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error creating topic:', error);
      return null;
    }
    
    console.log(`Topic created with ID: ${topicId}`);
    return topicId;
  } catch (err) {
    console.error('Unexpected error creating topic:', err);
    return null;
  }
}

// Mark a research as complete
async function markResearchAsComplete(researchId, userId) {
  console.log(`Marking research ${researchId} as complete`);
  
  try {
    // Check if research already has a completion topic
    const { data: existingData, error: existingError } = await supabase
      .from('research_progress_new')
      .select('progress_id')
      .eq('research_id', researchId)
      .ilike('topic', '%research_done%')
      .limit(1);
    
    if (existingError) {
      console.error('Error checking for existing completion topic:', existingError);
      return false;
    }
    
    // If a completion topic already exists, don't create another
    if (existingData && existingData.length > 0) {
      console.log('Research already marked as complete');
      return true;
    }
    
    // Create a completion ID
    const completionId = generateId('topic');
    
    // Insert the completion topic
    const { error: insertError } = await supabase
      .from('research_progress_new')
      .insert({
        progress_id: completionId,
        research_id: researchId,
        user_id: userId,
        topic: 'Research Complete research_done',
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
    
    console.log(`Successfully marked research ${researchId} as complete`);
    
    // Update the research history status
    const { error: updateError } = await supabase
      .from('research_history_new')
      .update({ status: 'completed' })
      .eq('research_id', researchId);
    
    if (updateError) {
      console.error('Error updating research history status:', updateError);
    }
    
    // Send completion notification to webhook
    try {
      const completionNotification = {
        research_id: researchId,
        user_id: userId,
        event: 'research_completed',
        timestamp: new Date().toISOString()
      };
      
      await axios.post(WEBHOOK_URL, completionNotification, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Sent completion notification to webhook');
    } catch (webhookError) {
      console.error('Error sending completion notification:', webhookError);
      // Continue even if webhook fails
    }
    
    return true;
  } catch (error) {
    console.error('Error in markResearchAsComplete:', error);
    return false;
  }
}

// Clean up test data
async function cleanupTestData(researchId) {
  console.log(`Cleaning up test data for research ID: ${researchId}`);
  
  try {
    // Delete progress data first (child table)
    const { error: progressError } = await supabase
      .from('research_progress_new')
      .delete()
      .eq('research_id', researchId);
    
    if (progressError) {
      console.error('Error clearing progress data:', progressError);
    } else {
      console.log('Successfully cleared progress data');
    }
    
    // Then delete history entry (parent table)
    const { error: historyError } = await supabase
      .from('research_history_new')
      .delete()
      .eq('research_id', researchId);
    
    if (historyError) {
      console.error('Error clearing history data:', historyError);
    } else {
      console.log('Successfully cleared history data');
    }
    
    console.log('Test data cleanup completed');
    return true;
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return false;
  }
}

// Main demo function
async function runDemo() {
  try {
    // Generate IDs for this demo
    const demoResearchId = generateId('demo-research');
    const demoUserId = generateId('demo-user');
    
    console.log('=== RESEARCH PROGRESS DEMO ===');
    console.log(`Research ID: ${demoResearchId}`);
    console.log(`User ID: ${demoUserId}`);
    console.log('============================\n');
    
    // Step 1: Create research history
    await createResearchHistory(demoResearchId, demoUserId);
    
    // Step 2: Create sample topics with delays between them
    console.log('\nCreating sample topics...');
    
    // Topic 1
    await createTopic(demoResearchId, demoUserId, 'Introduction to the Topic', [
      { url: 'https://example.com/intro1', title: 'Basic Overview' },
      { url: 'https://example.com/intro2', title: 'Historical Context' }
    ]);
    
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Topic 2
    await createTopic(demoResearchId, demoUserId, 'Key Concepts and Principles', [
      { url: 'https://example.com/concepts1', title: 'Fundamental Principles' },
      { url: 'https://example.com/concepts2', title: 'Theoretical Framework' }
    ]);
    
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Topic 3
    await createTopic(demoResearchId, demoUserId, 'Current Applications', [
      { url: 'https://example.com/apps1', title: 'Industry Applications' },
      { url: 'https://example.com/apps2', title: 'Research Directions' }
    ]);
    
    // Step 3: Mark the research as complete
    console.log('\nMarking research as complete...');
    const marked = await markResearchAsComplete(demoResearchId, demoUserId);
    
    if (marked) {
      console.log('Research successfully marked as complete!');
    } else {
      console.log('Failed to mark research as complete');
    }
    
    // Step 4: Prompt to clean up
    console.log('\nDemo completed!');
    console.log('To view the research progress, open the app and navigate to:');
    console.log(`ResearchProgressScreen with params: { research_id: "${demoResearchId}" }`);
    console.log('\nWould you like to clean up the test data? (y/n)');
    
    // This is a simplified version - in a real script, you'd prompt for input
    // For the demo, we'll leave the data for examination
    console.log('Data will be left in the database for examination.');
    console.log('To clean up later, run the cleanup function with:');
    console.log(`cleanupTestData("${demoResearchId}");`);
    
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

// Run the demo
runDemo();

// Export functions for reuse
module.exports = {
  createResearchHistory,
  createTopic,
  markResearchAsComplete,
  cleanupTestData
}; 
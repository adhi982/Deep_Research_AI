/**
 * Script to apply the SQL fix for the add_link_to_topic function
 * This resolves the issue with TEXT ID handling
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase URL and key from environment variables or use defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://wurrqztgdnecgtmsisrq.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cnJxenRnZG5lY2d0bXNpc3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzIyNTk1NiwiZXhwIjoyMDU4ODAxOTU2fQ.nwRS4NT_dV5xPyc6p4tuKs9IUFkxQpGxciRzjKS8h6Q';

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Path to the SQL file
const sqlFilePath = path.join(__dirname, '..', 'sql', 'link_function_fix.sql');

async function applySqlFix() {
  try {
    console.log('Reading SQL file...');
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`SQL file not found at: ${sqlFilePath}`);
      return false;
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Applying SQL fix to database with service role...');
    
    // Direct SQL execution through RPC
    const { data, error } = await supabase.rpc('pgexec', { sql: sqlContent });
    
    if (error) {
      console.error('Error applying SQL fix:', error);
      return false;
    }
    
    console.log('SQL fix applied successfully!');
    
    // Test the function to verify it works
    await testFunction();
    
    // Generate curl command examples for later use
    generateCurlExamples();
    
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

async function testFunction() {
  try {
    console.log('\nTesting add_link_to_topic function with TEXT parameter...');
    
    // Test with TEXT parameter
    const testTopicId = `test-topic-${Date.now()}`;
    const testResearchId = `test-research-fix-${Date.now()}`;
    
    // First create a test research history entry
    console.log('Creating test research history entry...');
    await supabase
      .from('research_history_new')
      .insert({
        research_id: testResearchId,
        user_id: 'test-user-fix',
        title: 'Test Research for Function Fix',
        created_at: new Date().toISOString()
      });
    
    // Then create a test topic
    console.log('Creating test topic...');
    await supabase
      .from('research_progress_new')
      .insert({
        progress_id: testTopicId,
        research_id: testResearchId,
        user_id: 'test-user-fix',
        topic: 'Test Topic for Function Fix',
        created_at: new Date().toISOString()
      });
    
    console.log(`Created test topic with ID: ${testTopicId}`);
    
    // Test the function
    console.log('Testing RPC function...');
    const { data, error } = await supabase.rpc('add_link_to_topic', {
      p_progress_id: testTopicId,
      p_url: 'https://example.com/test',
      p_title: 'Test Link'
    });
    
    if (error) {
      console.error('Error testing function:', error);
      return false;
    }
    
    console.log('Function test successful!');
    console.log('Returned links:', JSON.stringify(data, null, 2));
    
    // Clean up test data
    console.log('Cleaning up test data...');
    
    await supabase
      .from('research_progress_new')
      .delete()
      .eq('progress_id', testTopicId);
      
    await supabase
      .from('research_history_new')
      .delete()
      .eq('research_id', testResearchId);
      
    console.log('Test data cleaned up');
    
    return true;
  } catch (err) {
    console.error('Error testing function:', err);
    return false;
  }
}

function generateCurlExamples() {
  console.log('\n=== CURL COMMAND EXAMPLES ===');
  
  // Example with anon key (client-side)
  console.log('\n1. Using anon key (for client-side requests):');
  console.log(`curl -X POST '${supabaseUrl}/rest/v1/rpc/add_link_to_topic' \\
  -H 'apikey: ANON_KEY' \\
  -H 'Authorization: Bearer ANON_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "p_progress_id": "your-topic-id",
    "p_url": "https://example.com/test",
    "p_title": "Test Link"
  }'`);
  
  // Example with service role key (server-side)
  console.log('\n2. Using service role key (for server-side applications):');
  console.log(`curl -X POST '${supabaseUrl}/rest/v1/rpc/add_link_to_topic' \\
  -H 'apikey: ${serviceRoleKey}' \\
  -H 'Authorization: Bearer ${serviceRoleKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "p_progress_id": "your-topic-id",
    "p_url": "https://example.com/test",
    "p_title": "Test Link"
  }'`);
  
  console.log('\nNOTE: Replace "your-topic-id" with an actual topic ID from your database.');
  console.log('================================');
}

// Run the script
applySqlFix()
  .then(success => {
    if (success) {
      console.log('\n✅ SQL fix successfully applied and tested');
    } else {
      console.error('\n❌ Failed to apply SQL fix');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Script execution failed:', err);
    process.exit(1);
  }); 
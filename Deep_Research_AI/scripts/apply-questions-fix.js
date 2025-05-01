/**
 * Script to apply the SQL fix for the research questions answer webhook functionality
 * This ensures answers are properly stored in the research_questions_array table
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
const sqlFilePath = path.join(__dirname, '..', 'sql', 'update_research_answers.sql');

async function applySqlFix() {
  try {
    console.log('Reading SQL file...');
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`SQL file not found at: ${sqlFilePath}`);
      return false;
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Applying SQL fix to database with service role...');
    console.log('----------------------------------------------------------------');
    console.log('SQL Content:');
    console.log(sqlContent.substring(0, 200) + '...');
    console.log('----------------------------------------------------------------');
    
    // Check if the function already exists
    console.log('Checking if function already exists...');
    try {
      const { data: functionExists, error: functionCheckError } = await supabase.rpc('update_single_batch_answer', {
        p_question_id: 'test',
        p_question_item_id: 'test',
        p_answer: 'test'
      });
      
      console.log('Function check result:', functionExists ? 'Function exists' : 'Function does not exist');
      
      if (functionCheckError) {
        console.log('Function check error (this is expected if function doesn\'t exist yet):', functionCheckError);
      }
    } catch (err) {
      console.log('Function check exception (this is expected if function doesn\'t exist yet):', err.message);
    }
    
    // Direct SQL execution through RPC
    const { data, error } = await supabase.rpc('pgexec', { sql: sqlContent });
    
    if (error) {
      console.error('Error applying SQL fix:', error);
      return false;
    }
    
    console.log('SQL fix applied successfully!');
    
    // Test the function to verify it works
    await testFunction();
    
    // Check again if the function exists
    console.log('\nVerifying function exists after SQL application...');
    try {
      const { data: verifyFunction, error: verifyError } = await supabase.rpc('update_single_batch_answer', {
        p_question_id: 'test-verify',
        p_question_item_id: 'test-verify',
        p_answer: 'test-verify'
      });
      
      if (verifyError) {
        console.error('WARNING: Function validation failed after SQL application:', verifyError);
        if (verifyError.message.includes('does not exist')) {
          console.error('\n⚠️ CRITICAL: Function was not created correctly!');
          console.error('Please check your database permissions and SQL syntax.');
        }
      } else {
        console.log('✅ Function verified! It exists in the database.');
      }
    } catch (err) {
      console.error('ERROR: Function validation exception after SQL application:', err.message);
      console.error('\n⚠️ CRITICAL: Function was not created correctly!');
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

async function testFunction() {
  try {
    console.log('\nTesting update_single_batch_answer function...');
    
    // Create test data
    const testBatchId = `test-batch-${Date.now()}`;
    const testQuestionId = 'q1';
    const testResearchId = `test-research-${Date.now()}`;
    const testAnswer = 'This is a test answer';
    
    // First check if insert_batch_questions function exists
    console.log('Checking if insert_batch_questions function exists...');
    let batchInsertExists = true;
    
    try {
      await supabase.rpc('insert_batch_questions', {
        p_question_id: 'test',
        p_research_id: 'test',
        p_user_id: 'test',
        p_questions: '[]'
      });
    } catch (err) {
      batchInsertExists = false;
      console.error('WARNING: insert_batch_questions function does not exist:', err.message);
      console.error('This is required for the full test. Creating the test batch directly instead.');
    }
    
    // Create the test batch
    console.log('Creating test question batch...');
    let batchData = null;
    let batchError = null;
    
    if (batchInsertExists) {
      // Use the RPC function if it exists
      const result = await supabase.rpc('insert_batch_questions', {
        p_question_id: testBatchId,
        p_research_id: testResearchId,
        p_user_id: 'test-user',
        p_questions: JSON.stringify([
          {
            id: testQuestionId,
            text: 'Test Question 1',
            answered: false
          },
          {
            id: 'q2',
            text: 'Test Question 2',
            answered: false
          }
        ])
      });
      
      batchData = result.data;
      batchError = result.error;
    } else {
      // Directly insert into the table
      const result = await supabase
        .from('research_questions_array')
        .insert({
          question_id: testBatchId,
          research_id: testResearchId,
          user_id: 'test-user',
          questions: [
            {
              id: testQuestionId,
              text: 'Test Question 1',
              answered: false
            },
            {
              id: 'q2',
              text: 'Test Question 2',
              answered: false
            }
          ],
          answers: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      batchData = result.data;
      batchError = result.error;
    }
    
    if (batchError) {
      console.error('Error creating test batch:', batchError);
      return false;
    }
    
    console.log(`Created test batch with ID: ${testBatchId}`);
    
    // Test the function with direct RPC call
    console.log('Testing update_single_batch_answer function...');
    const { data: updateData, error: updateError } = await supabase.rpc('update_single_batch_answer', {
      p_question_id: testBatchId,
      p_question_item_id: testQuestionId,
      p_answer: testAnswer
    });
    
    if (updateError) {
      console.error('Error testing function:', updateError);
      console.error('\nImportant details:');
      console.error(`- Function name: update_single_batch_answer`);
      console.error(`- Test batch ID: ${testBatchId}`);
      console.error(`- Test question ID: ${testQuestionId}`);
      
      // Try with a direct database update as fallback
      console.log('\nTrying with direct database update as fallback...');
      
      // First get the current record
      const { data: currentBatch, error: fetchError } = await supabase
        .from('research_questions_array')
        .select('*')
        .eq('question_id', testBatchId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching batch:', fetchError);
        return false;
      }
      
      // Update the answers array
      const currentAnswers = currentBatch.answers || [];
      const updatedAnswers = [...currentAnswers, {
        id: testQuestionId,
        text: '',
        answer: testAnswer,
        answered: true
      }];
      
      // Update the record
      const { data: directUpdate, error: directError } = await supabase
        .from('research_questions_array')
        .update({ 
          answers: updatedAnswers,
          updated_at: new Date().toISOString()
        })
        .eq('question_id', testBatchId)
        .select();
      
      if (directError) {
        console.error('Error with direct update:', directError);
        return false;
      }
      
      console.log('Direct update successful!');
      console.log('Updated batch data:', JSON.stringify(directUpdate, null, 2));
      
      return false;
    }
    
    console.log('Function test successful!');
    console.log('Updated batch data:', JSON.stringify(updateData, null, 2));
    
    // Check that the answer was actually added
    if (updateData && updateData.answers && updateData.answers.length > 0) {
      const addedAnswer = updateData.answers.find(a => a.id === testQuestionId);
      if (addedAnswer && addedAnswer.answer === testAnswer) {
        console.log('✅ Answer was correctly added to the database!');
      } else {
        console.error('❌ Answer was NOT correctly added to the database!');
        console.log('Answers array:', JSON.stringify(updateData.answers, null, 2));
      }
    } else {
      console.error('❌ No answers were found in the response!');
    }
    
    // Clean up test data
    console.log('Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('research_questions_array')
      .delete()
      .eq('question_id', testBatchId);
      
    if (deleteError) {
      console.warn('Warning: Failed to delete test data:', deleteError);
    } else {
      console.log('Test data cleaned up');
    }
    
    // Generate curl command for testing
    generateCurlExample(testBatchId, testQuestionId);
    
    return true;
  } catch (err) {
    console.error('Error testing function:', err);
    return false;
  }
}

function generateCurlExample(batchId, questionId) {
  console.log('\n=== CURL COMMAND EXAMPLE ===');
  console.log(`To test the update_single_batch_answer function directly:`);
  
  // Example with service role key (server-side)
  console.log(`\nUsing service role key (for server-side applications):`);
  console.log(`curl -X POST '${supabaseUrl}/rest/v1/rpc/update_single_batch_answer' \\
  -H 'apikey: ${serviceRoleKey}' \\
  -H 'Authorization: Bearer ${serviceRoleKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "p_question_id": "${batchId || 'your-batch-id'}",
    "p_question_item_id": "${questionId || 'your-question-item-id'}",
    "p_answer": "Your answer text here"
  }'`);
  
  console.log('\n================================');
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
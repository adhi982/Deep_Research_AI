/**
 * Script to set up feedback tables in Supabase
 * 
 * Run this script using Node.js:
 * node setup_feedback_tables.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Get Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://wurrqztgdnecgtmsisrq.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cnJxenRnZG5lY2d0bXNpc3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMjU5NTYsImV4cCI6MjA1ODgwMTk1Nn0.Cwke6VXDuTvQmaEgk-QKw_hwhQmrpNG_34l0gob_6NA';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to SQL file
const sqlFilePath = path.join(__dirname, '..', 'sql', 'create_feedback_tables.sql');

async function setupFeedbackTables() {
  try {
    console.log('Reading SQL file...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Creating feedback tables...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error creating tables:', error);
      // Try alternative approach for databases without exec_sql function
      console.log('Trying alternative approach...');
      
      // Split SQL into statements
      const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        console.log(`Executing statement: ${statement.substring(0, 60)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`Error executing statement: ${error.message}`);
        }
      }
    } else {
      console.log('Feedback tables created successfully!');
    }
    
    // Verify tables exist
    console.log('Verifying tables...');
    const { data: feedbackTable, error: feedbackError } = await supabase
      .from('research_feedback')
      .select('feedback_id')
      .limit(1);
      
    if (feedbackError) {
      console.error('Error verifying research_feedback table:', feedbackError);
    } else {
      console.log('research_feedback table exists.');
    }
    
    // Check if the foreign key constraint is properly set up
    console.log('Checking foreign key constraint...');
    try {
      // Try to insert a fake feedback with non-existent research_id
      const testFeedback = {
        feedback_id: `test-${Date.now()}`,
        research_id: `non-existent-id-${Date.now()}`,
        rating: 5
      };
      
      const { error: constraintError } = await supabase
        .from('research_feedback')
        .insert(testFeedback);
      
      if (constraintError && constraintError.message.includes('foreign key constraint')) {
        console.log('Foreign key constraint is working properly.');
      } else if (constraintError) {
        console.log('Insertion failed but not due to foreign key constraint:', constraintError.message);
      } else {
        console.warn('Warning: Insertion with invalid research_id succeeded. Foreign key constraint may not be working.');
        
        // Clean up the test entry
        await supabase
          .from('research_feedback')
          .delete()
          .eq('feedback_id', testFeedback.feedback_id);
      }
    } catch (constraintErr) {
      console.error('Error testing foreign key constraint:', constraintErr);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

setupFeedbackTables().then(() => {
  console.log('Setup complete.');
}).catch(err => {
  console.error('Setup failed:', err);
}); 
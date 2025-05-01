#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// Helper function to print colorful messages
function print(message, color = colors.fg.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Print a header
function printHeader(title) {
  const line = '='.repeat(title.length + 8);
  console.log('');
  print(line, colors.fg.cyan);
  print(`    ${title}    `, colors.fg.cyan + colors.bright);
  print(line, colors.fg.cyan);
  console.log('');
}

// Ask a question and get user input
function ask(question) {
  return new Promise(resolve => {
    rl.question(`${colors.fg.yellow}${question}${colors.reset} `, answer => {
      resolve(answer);
    });
  });
}

// Check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Main setup function
async function setupArrayQuestions() {
  printHeader('Array-Based Questions Setup');
  
  // Step 1: Check for required files
  print('Step 1: Checking for required files...', colors.fg.magenta);
  
  const rootDir = path.resolve(__dirname, '..');
  const sqlFilePath = path.join(rootDir, 'sql', 'update_research_questions.sql');
  const testScriptPath = path.join(rootDir, 'test-array-questions.js');
  
  if (!fileExists(sqlFilePath)) {
    print(`❌ SQL file not found: ${sqlFilePath}`, colors.fg.red);
    print('Please make sure the SQL file exists before running this script.', colors.fg.red);
    return;
  }
  
  print('✅ SQL file found', colors.fg.green);
  
  if (!fileExists(testScriptPath)) {
    print(`⚠️ Test script not found: ${testScriptPath}`, colors.fg.yellow);
    print('The test script will be skipped.', colors.fg.yellow);
  } else {
    print('✅ Test script found', colors.fg.green);
  }
  
  // Step 2: SQL instructions
  printHeader('SQL Setup Instructions');
  print('To set up the array-based questions feature, you need to execute the SQL commands in your Supabase project.', colors.fg.white);
  print('1. Go to your Supabase project dashboard', colors.fg.white);
  print('2. Navigate to the SQL Editor', colors.fg.white);
  print('3. Copy and paste the following SQL commands:', colors.fg.white);
  console.log('');
  
  // Display the SQL content
  try {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    print(sqlContent, colors.fg.cyan + colors.dim);
  } catch (error) {
    print(`Error reading SQL file: ${error.message}`, colors.fg.red);
  }
  
  // Step 3: Test script
  if (fileExists(testScriptPath)) {
    printHeader('Test Script');
    print('You can run the test script to verify that the array-based questions feature is working correctly.', colors.fg.white);
    print('The script will:', colors.fg.white);
    print('- Create a batch of test questions', colors.fg.white);
    print('- Set up a real-time subscription', colors.fg.white);
    print('- Submit answers and notify the webhook', colors.fg.white);
    console.log('');
    
    const runTest = await ask('Would you like to run the test script now? (y/n)');
    
    if (runTest.toLowerCase() === 'y') {
      print('Running test script...', colors.fg.magenta);
      
      try {
        console.log('');
        execSync(`node ${testScriptPath}`, { stdio: 'inherit' });
        console.log('');
        print('✅ Test script completed successfully', colors.fg.green);
      } catch (error) {
        print(`❌ Error running test script: ${error.message}`, colors.fg.red);
      }
    }
  }
  
  // Step 4: Conclusion
  printHeader('Setup Complete');
  print('The array-based questions feature should now be ready to use.', colors.fg.green);
  print('For more information, see the README-ARRAY-QUESTIONS.md file.', colors.fg.white);
  
  rl.close();
}

// Run the setup
setupArrayQuestions().catch(error => {
  print(`❌ Error during setup: ${error.message}`, colors.fg.red);
  rl.close();
}); 
 
 
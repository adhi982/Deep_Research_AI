import { supabase, generateEntityId } from './supabase';
import config from './config';

/**
 * Interface for individual question data
 */
export interface QuestionItem {
  id: string;
  text: string;
  answer?: string;
  answered: boolean;
}

/**
 * Interface for research question data with array structure
 */
export interface ResearchQuestionArray {
  question_id: string;
  research_id: string;
  user_id: string;
  questions: QuestionItem[];
  answers: QuestionItem[];
  reply_webhook_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Legacy interface for research question data (single question per row)
 * Kept for backward compatibility
 */
export interface ResearchQuestion {
  question_id: string;
  research_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered: boolean;
  reply_webhook_url?: string;
  created_at: string;
}

/**
 * Fetches questions for a specific research ID from the new array-based table
 * @param researchId The ID of the research to fetch questions for
 * @returns Array of research questions in the old format for compatibility
 */
export async function fetchQuestions(researchId: string): Promise<ResearchQuestion[]> {
  try {
    console.log(`Fetching questions for research: ${researchId}`);
    
    // First try the new array-based table
    const { data: arrayData, error: arrayError } = await supabase
      .from('research_questions_array')
      .select('*')
      .eq('research_id', researchId)
      .order('created_at', { ascending: true });
    
    if (!arrayError && arrayData && arrayData.length > 0) {
      console.log(`Fetched questions from array table for research: ${researchId}`);
      
      // Convert the array-based format to the old format for compatibility
      let flattenedQuestions: ResearchQuestion[] = [];
      
      for (const record of arrayData) {
        const questions = record.questions || [];
        const answers = record.answers || [];
        
        // Map questions to the old format
        const convertedQuestions = questions.map((q: QuestionItem, index: number) => {
          // Find matching answer if exists
          const matchingAnswer = answers.find((a: QuestionItem) => a.id === q.id);
          
          return {
            question_id: `${record.question_id}-${q.id || index}`,
            research_id: record.research_id,
            user_id: record.user_id,
            question: q.text,
            answer: matchingAnswer?.answer || undefined,
            answered: matchingAnswer?.answered || false,
            reply_webhook_url: record.reply_webhook_url,
            created_at: record.created_at
          };
        });
        
        flattenedQuestions = [...flattenedQuestions, ...convertedQuestions];
      }
      
      console.log(`Converted ${flattenedQuestions.length} questions to legacy format`);
      return flattenedQuestions;
    }
    
    // Fall back to the old table if needed
    console.log(`Falling back to legacy table for research: ${researchId}`);
    const { data, error } = await supabase
      .from('research_questions_new')
      .select('*')
      .eq('research_id', researchId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
    
    console.log(`Fetched ${data.length} questions from legacy table for research: ${researchId}`);
    return data as ResearchQuestion[];
  } catch (error) {
    console.error('Unexpected error in fetchQuestions:', error);
    return [];
  }
}

/**
 * Stores an answer for a specific question
 * @param questionId The ID of the question to answer
 * @param answer The answer to store
 * @returns Success flag and data or error
 */
export async function submitAnswer(questionId: string, answer: string): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log(`Submitting answer for question: ${questionId}`);
    
    // Split the questionId to check if it's from the new array-based format
    const parts = questionId.split('-');
    const isArrayFormat = parts.length > 1;
    const baseQuestionId = isArrayFormat ? parts[0] : questionId;
    const questionItemId = isArrayFormat ? parts[1] : null;
    
    if (isArrayFormat && questionItemId) {
      // Handle array-based questions
      console.log(`Using array-based update for question ID: ${baseQuestionId}, item ID: ${questionItemId}`);
      
      // Fetch the current record to get the existing answers and questions
      const { data: currentRecord, error: fetchError } = await supabase
        .from('research_questions_array')
        .select('*')
        .eq('question_id', baseQuestionId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching question record:', fetchError);
        return { success: false, error: fetchError };
      }
      
      // Log current state for debugging
      console.log(`Got current record with ${currentRecord?.questions?.length || 0} questions and ${currentRecord?.answers?.length || 0} answers`);
      
      let updateData;
      let updateError;
      
      // STEP 1: Try multiple approaches to save the answer
      
      // First try - Attempt to use the update_single_batch_answer RPC function
      console.log('STEP 1: Trying to use the update_single_batch_answer RPC function...');
      try {
        const rpcResult = await supabase.rpc('update_single_batch_answer', {
          p_question_id: baseQuestionId,
          p_question_item_id: questionItemId,
          p_answer: answer
        });
        
        updateData = rpcResult.data;
        updateError = rpcResult.error;
        
        if (updateError) {
          console.error('1️⃣ RPC function error:', updateError);
        } else {
          console.log('1️⃣ RPC function success!');
        }
      } catch (rpcError) {
        console.error('1️⃣ RPC function exception:', rpcError);
        updateError = { message: rpcError.message };
      }
      
      // Second try - If RPC fails, try direct client-side update
      if (updateError) {
        console.log('STEP 2: RPC failed, trying direct client-side update...');
        
        // Update or create an answer for this specific question
        const existingAnswers = currentRecord.answers || [];
        let updatedAnswers = [...existingAnswers];
        
        // Check if we already have an answer for this question
        const existingAnswerIndex = updatedAnswers.findIndex((a: QuestionItem) => a.id === questionItemId);
        
        if (existingAnswerIndex >= 0) {
          // Update existing answer
          console.log('2️⃣ Updating existing answer at index', existingAnswerIndex);
          updatedAnswers[existingAnswerIndex] = {
            ...updatedAnswers[existingAnswerIndex],
            answer,
            answered: true
          };
        } else {
          // Add new answer
          console.log('2️⃣ Adding new answer');
          updatedAnswers.push({
            id: questionItemId,
            text: '', // We don't need the question text in the answers array
            answer,
            answered: true
          });
        }
        
        // Verify the update worked
        console.log(`Updated answers array now has ${updatedAnswers.length} items`);
        
        // Update the record in the database
        const fallbackResult = await supabase
          .from('research_questions_array')
          .update({ 
            answers: updatedAnswers,
            updated_at: new Date().toISOString()
          })
          .eq('question_id', baseQuestionId)
          .select();
        
        updateData = fallbackResult.data?.[0];
        updateError = fallbackResult.error;
        
        if (updateError) {
          console.error('2️⃣ Client-side update error:', updateError);
        } else {
          console.log('2️⃣ Client-side update success!');
        }
      }
      
      // Third try - If both previous attempts fail, try minimal approach
      if (updateError) {
        console.log('STEP 3: Both attempts failed, trying minimal approach...');
        
        // Create a very simple answers array with just this answer
        const minimalAnswers = [{
          id: questionItemId,
          answer,
          answered: true
        }];
        
        // Update the record with just the answers
        const minimalResult = await supabase
          .from('research_questions_array')
          .update({ 
            answers: minimalAnswers,
            updated_at: new Date().toISOString()
          })
          .eq('question_id', baseQuestionId)
          .select();
        
        updateData = minimalResult.data?.[0];
        updateError = minimalResult.error;
        
        if (updateError) {
          console.error('3️⃣ Minimal update error:', updateError);
          return { success: false, error: updateError };
        } else {
          console.log('3️⃣ Minimal update success!');
        }
      }
      
      // STEP 2: Handle webhook notification
      
      // If we got here, one of the update methods worked
      console.log('Update successful. Current answers:', JSON.stringify(updateData?.answers, null, 2));
      
      // Check for webhook
      if (currentRecord.reply_webhook_url) {
        try {
          // Find the original question text from the questions array
          const questions = currentRecord.questions || [];
          const questionItem = questions.find((q: QuestionItem) => q.id === questionItemId);
          
          // Create a more comprehensive payload that includes all questions and answers
          const webhookPayload = {
            // Include original single answer data for backward compatibility
            question_id: questionId,
            question_item_id: questionItemId,
            research_id: currentRecord.research_id,
            question: questionItem?.text || '',
            answer,
            
            // Include the full batch data for n8n compatibility
            question_batch_id: baseQuestionId,
            user_id: currentRecord.user_id,
            
            // Include all questions and answers for context
            questions: questions.map(q => ({
              id: q.id,
              text: q.text,
              answered: updateData?.answers?.some((a: QuestionItem) => a.id === q.id) || false
            })),
            
            // Include all answers
            answers: updateData?.answers?.map((a: QuestionItem) => {
              // Find the original question for context
              const q = questions.find(q => q.id === a.id);
              return {
                id: a.id,
                question: q?.text || '',
                answer: a.answer,
                answered: a.answered
              };
            }) || [],
            
            submitted_at: new Date().toISOString()
          };
          
          // Log the full webhook payload for debugging
          console.log(`===== WEBHOOK PAYLOAD =====`);
          console.log(JSON.stringify(webhookPayload, null, 2));
          
          // Ensure webhook URL is properly formatted
          let webhookUrl = currentRecord.reply_webhook_url;
          
          // Add protocol if missing
          if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
            webhookUrl = 'https://' + webhookUrl;
          }
          
          console.log(`Sending answer to webhook URL: ${webhookUrl}`);
          
          // Check if this is an n8n wait node webhook (contains webhook-waiting in the URL)
          const isN8nWaitNode = webhookUrl.includes('webhook-waiting');
          
          let webhookResponse;
          
          if (isN8nWaitNode) {
            console.log('Detected n8n wait node webhook. Using multipart-form-data format...');
            
            // For n8n wait node, use multipart-form-data
            const formData = new FormData();
            
            // Add the original fields for backward compatibility
            formData.append('question_id', questionId);
            formData.append('question_item_id', questionItemId);
            formData.append('research_id', currentRecord.research_id);
            formData.append('question', questionItem?.text || '');
            formData.append('answer', answer);
            
            // Add the full payload for advanced processing
            formData.append('payload', JSON.stringify(webhookPayload));
            
            // Add individual fields for easier access in n8n
            formData.append('question_batch_id', baseQuestionId);
            formData.append('user_id', currentRecord.user_id);
            formData.append('submitted_at', new Date().toISOString());
            
            // Add questions and answers as separate form fields for direct access
            formData.append('questions', JSON.stringify(webhookPayload.questions));
            formData.append('answers', JSON.stringify(webhookPayload.answers));
            
            // Send the data using multipart form data
            webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              // Note: No need to specify Content-Type header - fetch will set it correctly with boundary
              body: formData,
            });
          } else {
            // For regular webhooks, use JSON payload
            webhookResponse = await fetch(currentRecord.reply_webhook_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload),
            });
          }
          
          if (!webhookResponse.ok) {
            console.warn(`Webhook response was not OK: ${webhookResponse.status}`);
            
            // Try to get response text for debugging
            try {
              const responseText = await webhookResponse.text();
              console.warn(`Webhook response body: ${responseText}`);
            } catch (responseError) {
              console.warn(`Could not read webhook response body: ${responseError}`);
            }
          } else {
            console.log('Successfully sent answer to webhook');
            
            // Try to log the response payload
            try {
              const responseData = await webhookResponse.json();
              console.log(`Webhook response data:`, responseData);
            } catch (parseError) {
              console.log(`Successfully sent answer to webhook (no JSON response)`);
            }
          }
        } catch (webhookError) {
          console.error('Error sending answer to webhook:', webhookError);
          // We continue even if webhook fails, since we updated the database
        }
      }
      
      return { success: true, data: updateData };
    } else {
      // Legacy format - single question per row
      // 1. Update the question in Supabase
      const { data, error } = await supabase
        .from('research_questions_new')
        .update({ 
          answer, 
          answered: true 
        })
        .eq('question_id', questionId)
        .select();
      
      if (error) {
        console.error('Error submitting answer:', error);
        return { success: false, error };
      }
      
      // 2. Check if there's a webhook URL to call
      const question = data[0] as ResearchQuestion;
      if (question.reply_webhook_url) {
        try {
          // Send the answer to the webhook
          const webhookResponse = await fetch(question.reply_webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question_id: questionId,
              research_id: question.research_id,
              answer
            }),
          });
          
          if (!webhookResponse.ok) {
            console.warn(`Webhook response was not OK: ${webhookResponse.status}`);
          } else {
            console.log('Successfully sent answer to webhook');
          }
        } catch (webhookError) {
          console.error('Error sending answer to webhook:', webhookError);
          // We continue even if webhook fails, since we updated the database
        }
      }
      
      console.log('Successfully submitted answer');
      return { success: true, data };
    }
  } catch (error) {
    console.error('Unexpected error in submitAnswer:', error);
    return { success: false, error };
  }
}

/**
 * Sets up a polling mechanism to monitor for new questions
 * @param researchId The ID of the research to monitor
 * @param onQuestionsUpdate Callback function when questions are updated
 * @param pollingInterval Interval in ms between polls (default: 2000ms)
 * @returns A function to stop the polling
 */
export function monitorQuestions(
  researchId: string,
  onQuestionsUpdate: (questions: ResearchQuestion[]) => void,
  pollingInterval = 2000
): () => void {
  console.log(`Starting question monitoring for research: ${researchId}`);
  
  let lastQuestionCount = 0;
  let isActive = true;
  
  // Function to check for new questions
  const checkForQuestions = async () => {
    if (!isActive) return;
    
    try {
      const questions = await fetchQuestions(researchId);
      
      // Check if there are any changes
      if (questions.length !== lastQuestionCount) {
        console.log(`Questions updated: ${lastQuestionCount} → ${questions.length}`);
        lastQuestionCount = questions.length;
        onQuestionsUpdate(questions);
      }
    } catch (error) {
      console.error('Error in question monitoring:', error);
    }
    
    // Schedule the next check if still active
    if (isActive) {
      setTimeout(checkForQuestions, pollingInterval);
    }
  };
  
  // Start the initial check
  checkForQuestions();
  
  // Return a function to stop the polling
  return () => {
    console.log(`Stopping question monitoring for research: ${researchId}`);
    isActive = false;
  };
}

/**
 * Creates a batch of test questions for testing purposes
 * @param researchId The ID of the research to create questions for
 * @param userId The user ID
 * @param questionTexts Array of question texts to create
 * @returns The created questions record
 */
export async function createBatchTestQuestions(
  researchId: string, 
  userId: string,
  questionTexts: string[]
): Promise<ResearchQuestionArray | null> {
  try {
    // Skip if no questions provided
    if (!questionTexts || questionTexts.length === 0) {
      console.error('No question texts provided for batch creation');
      return null;
    }
    
    const questionId = generateEntityId('question-batch');
    
    // Format questions as array items
    const questionItems: QuestionItem[] = questionTexts.map((text, index) => ({
      id: `q${index + 1}`,
      text,
      answered: false
    }));
    
    const questionData = {
      question_id: questionId,
      research_id: researchId,
      user_id: userId,
      questions: questionItems,
      answers: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('research_questions_array')
      .insert([questionData])
      .select();
    
    if (error) {
      console.error('Error creating batch test questions:', error);
      return null;
    }
    
    console.log(`Successfully created batch of ${questionItems.length} questions`);
    return data[0] as ResearchQuestionArray;
  } catch (error) {
    console.error('Unexpected error in createBatchTestQuestions:', error);
    return null;
  }
}

/**
 * Creates a single test question (legacy format)
 * @param researchId The ID of the research to create a question for
 * @param userId The user ID
 * @returns The created question
 */
export async function createTestQuestion(researchId: string, userId: string): Promise<ResearchQuestion | null> {
  try {
    const questionData = {
      question_id: generateEntityId('question'),
      research_id: researchId,
      user_id: userId,
      question: `Test question created at ${new Date().toISOString()}`,
      answered: false,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('research_questions_new')
      .insert([questionData])
      .select();
    
    if (error) {
      console.error('Error creating test question:', error);
      return null;
    }
    
    return data[0] as ResearchQuestion;
  } catch (error) {
    console.error('Unexpected error in createTestQuestion:', error);
    return null;
  }
}

/**
 * Submits all answers for a research question batch
 * @param researchId The ID of the research to submit answers for
 * @param answers Record mapping question IDs to answers
 * @returns Success flag and data or error
 */
export async function submitAllAnswers(
  researchId: string,
  answers: Record<string, string>
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log(`Submitting all answers for research ID: ${researchId}`);
    console.log(`Have ${Object.keys(answers).length} answers to submit`);
    
    // Validate inputs
    if (!researchId) {
      console.error('Missing research ID');
      return { success: false, error: { message: 'Missing research ID' } };
    }
    
    if (!answers || Object.keys(answers).length === 0) {
      console.error('No answers provided');
      return { success: false, error: { message: 'No answers provided' } };
    }
    
    // Get the question batch from the array-based table
    const { data: arrayData, error: arrayError } = await supabase
      .from('research_questions_array')
      .select('*')
      .eq('research_id', researchId)
      .order('created_at', { ascending: true })
      .maybeSingle();
    
    if (arrayError) {
      console.error('Error fetching question array:', arrayError);
    }
    
    // If we have array data, update it
    if (arrayData) {
      console.log(`Found question batch: ${arrayData.question_id}`);
      
      // Get existing answers array or create new one
      const existingAnswers = arrayData.answers || [];
      let updatedAnswers = [...existingAnswers];
      
      // Count how many answers we're actually updating
      let updatedCount = 0;
      
      // Update each answer in the batch
      for (const [questionId, answerText] of Object.entries(answers)) {
        // Skip empty answers
        if (!answerText || answerText.trim() === '') {
          console.log(`Skipping empty answer for question: ${questionId}`);
          continue;
        }
        
        console.log(`Processing answer for question: ${questionId}`);
        
        // Extract the item ID from the compound question ID (batchId-itemId)
        const parts = questionId.split('-');
        const questionItemId = parts.length > 1 ? parts[1] : null;
        
        if (!questionItemId) {
          console.warn(`Invalid question ID format: ${questionId}, expected format: batchId-itemId`);
          continue;
        }
        
        // Find if we already have an answer for this question
        const existingIndex = updatedAnswers.findIndex((a: QuestionItem) => a.id === questionItemId);
        
        if (existingIndex >= 0) {
          // Update existing answer
          updatedAnswers[existingIndex] = {
            ...updatedAnswers[existingIndex],
            answer: answerText,
            answered: true
          };
        } else {
          // Add new answer
          updatedAnswers.push({
            id: questionItemId,
            text: '', // We don't need the text in the answers array
            answer: answerText,
            answered: true
          });
        }
        
        updatedCount++;
      }
      
      console.log(`Updating ${updatedCount} answers in the database`);
      
      // Update the database with the new answers
      const { data: updateData, error: updateError } = await supabase
        .from('research_questions_array')
        .update({
          answers: updatedAnswers,
          updated_at: new Date().toISOString()
        })
        .eq('question_id', arrayData.question_id)
        .select();
      
      if (updateError) {
        console.error('Error updating answers in database:', updateError);
        return { success: false, error: updateError };
      }
      
      console.log('Successfully updated answers in database');
      
      // WEBHOOK HANDLING
      // Check for webhook URL in the question data
      let webhookUrl = arrayData?.reply_webhook_url;
      
      // If no webhook URL in the array data, check the legacy table
      if (!webhookUrl) {
        // Try to get it from one of the questions
        for (const questionId of Object.keys(answers)) {
          try {
            const { data: questionData } = await supabase
              .from('research_questions_new')
              .select('reply_webhook_url')
              .eq('question_id', questionId)
              .single();
              
            if (questionData?.reply_webhook_url) {
              webhookUrl = questionData.reply_webhook_url;
              console.log(`Found webhook URL from question: ${webhookUrl}`);
              break;
            }
          } catch (e) {
            // Skip errors in webhook URL lookup
          }
        }
      }
      
      // If still no webhook URL, use the global fallback from config
      if (!webhookUrl && config.N8N_WEBHOOK_URL) {
        webhookUrl = config.N8N_WEBHOOK_URL;
        console.log(`Using fallback webhook URL from config`);
      }

      // Send data to webhook if URL is available
      if (webhookUrl) {
        try {
          // Prepare a more comprehensive payload with both questions and answers
          const questions = arrayData.questions || [];
          
          // Match answers with questions to create a more usable payload
          const answeredQuestions = questions.map((q: QuestionItem) => {
            const answerItem = updatedAnswers.find((a: QuestionItem) => a.id === q.id);
            return {
              id: q.id,
              question: q.text,
              answer: answerItem?.answer || '',
              answered: Boolean(answerItem?.answer)
            };
          });
          
          const webhookPayload = {
            research_id: researchId,
            timestamp: new Date().toISOString(),
            question_batch_id: arrayData.question_id,
            questions: answeredQuestions,
            answers: updatedAnswers,
            meta: {
              total_questions: questions.length,
              answered_questions: updatedAnswers.length,
              platform: 'mobile-app'
            }
          };
          
          // Log the full webhook payload for debugging
          console.log(`===== WEBHOOK PAYLOAD =====`);
          console.log(JSON.stringify(webhookPayload, null, 2));
          
          // Ensure webhook URL is properly formatted
          if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
            webhookUrl = 'https://' + webhookUrl;
          }
          
          console.log(`Sending answers to webhook URL: ${webhookUrl}`);
          
          // Check if this is an n8n wait node webhook (contains webhook-waiting in the URL)
          const isN8nWaitNode = webhookUrl.includes('webhook-waiting');
          
          let webhookResponse;
          
          if (isN8nWaitNode) {
            console.log('Detected n8n wait node webhook. Using multipart-form-data format...');
            
            // Create form data for n8n wait node
            const formData = new FormData();
            
            // Add the full payload as a JSON string
            formData.append('payload', JSON.stringify(webhookPayload));
            
            // Also add each major component separately to make it easier to use in n8n
            formData.append('research_id', researchId);
            formData.append('question_batch_id', arrayData.question_id);
            formData.append('timestamp', new Date().toISOString());
            formData.append('questions', JSON.stringify(webhookPayload.questions));
            formData.append('answers', JSON.stringify(webhookPayload.answers));
            
            // Use fetch API with form data
            webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              body: formData,
            });
          } else {
            // For regular webhooks, use JSON payload
            webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload),
            });
          }
          
          // Check webhook response
          console.log(`Webhook response status: ${webhookResponse.status}`);
          
          if (!webhookResponse.ok) {
            console.warn(`Webhook response error: ${webhookResponse.status} ${webhookResponse.statusText}`);
            
            try {
              const responseText = await webhookResponse.text();
              console.warn(`Webhook response: ${responseText}`);
            } catch (textErr) {
              console.warn(`Could not read webhook response: ${textErr}`);
            }
          } else {
            console.log('Successfully sent answers to webhook');
            
            try {
              const responseData = await webhookResponse.json();
              console.log(`Webhook response data:`, responseData);
            } catch (jsonErr) {
              // Not a JSON response, that's fine
              console.log(`Webhook response was not JSON (this is normal)`);
            }
          }
        } catch (webhookErr) {
          // Don't fail the whole operation if webhook fails
          console.error('Error sending to webhook:', webhookErr);
        }
      } else {
        console.log('No webhook URL found, skipping webhook notification');
      }
      
      // Return success data
      return {
        success: true,
        data: {
          question_batch_id: arrayData.question_id,
          answers: updatedAnswers,
          count: updatedCount
        }
      };
    }
    
    // ... rest of the implementation remains the same
  } catch (error) {
    console.error('Error in submitAllAnswers:', error);
    return { success: false, error };
  }
}

/**
 * Fetches research progress data for a specific research ID
 * @param researchId The ID of the research to fetch progress for
 * @returns Array of research progress items
 */
export async function fetchResearchProgress(researchId: string) {
  try {
    console.log(`Fetching research progress for: ${researchId}`);
    
    const { data, error } = await supabase
      .from('research_progress_new')
      .select('*')
      .eq('research_id', researchId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching research progress:', error);
      return [];
    }
    
    console.log(`Fetched ${data.length} progress items for research: ${researchId}`);
    
    // Transform data to ensure links is an array
    return data.map(item => ({
      ...item,
      links: Array.isArray(item.links) ? item.links : []
    }));
  } catch (error) {
    console.error('Unexpected error in fetchResearchProgress:', error);
    return [];
  }
}

/**
 * Sets up a real-time subscription to monitor research progress updates
 * @param researchId The ID of the research to monitor progress for
 * @param callback Function to call when new progress data is received
 * @returns Cleanup function to remove the subscription
 */
export function monitorResearchProgress(
  researchId: string,
  callback: (progressItems: any[]) => void
) {
  console.log(`Setting up realtime subscription for research progress: ${researchId}`);
  
  try {
    // Set up subscription
    const subscription = supabase
      .channel(`progress-${researchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'research_progress_new',
        filter: `research_id=eq.${researchId}`
      }, (payload) => {
        console.log('Progress update received:', payload);
        
        // Fetch all progress items to keep them in sync
        fetchResearchProgress(researchId).then(callback);
      })
      .subscribe();
    
    // Return cleanup function
    return () => {
      console.log(`Removing progress subscription for: ${researchId}`);
      supabase.removeChannel(subscription);
    };
  } catch (error) {
    console.error('Error setting up progress monitoring:', error);
    return () => {}; // Return empty cleanup function
  }
}
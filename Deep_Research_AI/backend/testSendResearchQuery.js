// Test script for sendResearchQuery
const axios = require('axios');

// n8n webhook URL
const WEBHOOK_URL = 'https://atomic123.app.n8n.cloud/webhook-test/055cedaa-a313-4625-a41c-7e7f9560b7a3';

/**
 * Simplified version of sendResearchQuery for testing
 * @param {Object} params - Research query parameters 
 * @returns {Promise} Promise with the response data
 */
const sendResearchQuery = async (params) => {
  try {
    // Prepare payload with additional metadata
    const payload = {
      ...params,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    
    // Send request to webhook
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    console.error('Error sending research query to webhook:', error.message);
    
    // Return structured error response
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      status: error.response?.status || 500
    };
  }
};

// Test data
const testData = {
  user_id: "test-user-123",
  agent: "general",
  query: "What are the latest advancements in quantum computing?",
  breadth: 3,
  depth: 4,
  include_technical_terms: true,
  output_format: "Research Paper"
};

// Run the test
(async () => {
  console.log('Starting test of sendResearchQuery...');
  
  try {
    const result = await sendResearchQuery(testData);
    
    if (result.success) {
      console.log('✅ Test successful!');
      console.log('Status code:', result.status);
      console.log('Response data:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Test failed!');
      console.log('Error:', result.error);
      console.log('Status code:', result.status);
    }
  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
  
  console.log('Test completed.');
})(); 
 
 
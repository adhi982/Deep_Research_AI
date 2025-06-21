import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  FlatList,
  ScrollView,
  Alert
} from 'react-native';
import { supabase } from '../utils/supabase';

interface ResearchQuestion {
  question_id: string;
  research_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered: boolean;
  reply_webhook_url?: string;
  created_at: string;
}

interface ResearchQuestionsProps {
  researchId: string;
  onQuestionsLoaded?: (hasQuestions: boolean) => void;
}

const ResearchQuestions: React.FC<ResearchQuestionsProps> = ({ 
  researchId,
  onQuestionsLoaded 
}) => {
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const supabaseSubscriptionRef = useRef<any>(null);

  // Load initial questions and set up monitoring
  useEffect(() => {
    if (!researchId) return;
    
    console.log('Starting questions component with research ID:', researchId);
    
    // Initial fetch of questions
    loadQuestions();
    
    // Set up real-time monitoring for questions
    setupQuestionSubscription();
    
    // Clean up monitoring when component unmounts
    return () => {
      cleanupSubscription();
    };
  }, [researchId]);
  
  // Set up Supabase real-time subscription for questions
  const setupQuestionSubscription = () => {
    if (!researchId) return;
    
    // Create and subscribe to a channel for research_questions_array
    const questionsChannel = supabase
      .channel(`research_questions:${researchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_questions_array',
          filter: `research_id=eq.${researchId}`
        },
        (payload: any) => {
          console.log('Question change received:', payload);
          
          // Handle different event types
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Refresh questions on insert or update
            loadQuestions();
          }
        }
      )
      .subscribe();
    
    // Store subscription ref for cleanup
    supabaseSubscriptionRef.current = questionsChannel;
  };
  
  // Clean up Supabase subscription
  const cleanupSubscription = () => {
    if (supabaseSubscriptionRef.current) {
      supabase.removeChannel(supabaseSubscriptionRef.current);
      supabaseSubscriptionRef.current = null;
    }
  };
  
  // Load initial questions from Supabase
  const loadQuestions = async () => {
    setLoading(true);
    
    try {
      console.log(`Fetching questions for research ID: ${researchId}`);
      
      // First, try to get questions from research_questions_array table
      const { data: batchData, error: batchError } = await supabase
        .from('research_questions_array')
        .select('*')
        .eq('research_id', researchId)
        .maybeSingle();
      
      if (batchError && batchError.code !== 'PGRST116') {
        console.error('Error fetching question batch:', batchError);
        throw batchError;
      }
      
      let questionsArray: ResearchQuestion[] = [];
      
      if (batchData && batchData.questions && Array.isArray(batchData.questions)) {
        console.log(`Found batch with ${batchData.questions.length} questions`);
        
        // Format the questions from the batch
        questionsArray = batchData.questions.map((q: any, index: number) => ({
          question_id: q.id || `${batchData.question_id}-q${index + 1}`,
          research_id: researchId,
          user_id: batchData.user_id,
          question: q.text || q.question,
          answer: q.answer || null,
          answered: !!q.answer,
          created_at: batchData.created_at || new Date().toISOString()
        }));
      } else {
        // Fallback to direct questions if no batch is found
        const { data: directQuestions, error: directError } = await supabase
          .from('research_questions')
          .select('*')
          .eq('research_id', researchId)
          .order('created_at', { ascending: true });
        
        if (directError) {
          console.error('Error fetching direct questions:', directError);
          // Don't throw here, just log the error as we might not have this table
        }
        
        if (directQuestions && directQuestions.length > 0) {
          console.log(`Found ${directQuestions.length} direct questions`);
          questionsArray = directQuestions;
        }
      }
      
      // Set the questions state
      setQuestions(questionsArray);
      
      // Initialize answers state with any existing answers
      const initialAnswers: Record<string, string> = {};
      questionsArray.forEach(q => {
        if (q.answer) {
          initialAnswers[q.question_id] = q.answer;
        }
      });
      setAnswers(initialAnswers);
      
      // Notify parent component if provided
      if (onQuestionsLoaded) {
        onQuestionsLoaded(questionsArray.length > 0);
      }
    } catch (err) {
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle text input changes for answers
  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };
  
  // Submit all answers at once
  const handleSubmitAll = async () => {
    // Check if we have any answers to submit
    const hasAnswers = Object.values(answers).some(answer => answer && answer.trim() !== '');
    if (!hasAnswers) return;
    
    setSubmitting(true);
    
    try {
      console.log(`Submitting all answers for research ID: ${researchId}`);
      console.log(`Current answers object:`, JSON.stringify(answers));
      
      // For each answer, insert or update in the database
      const allSubmissions = Object.entries(answers).map(async ([questionId, answer]) => {
        if (!answer || answer.trim() === '') return null;
        
        // Find the corresponding question
        const question = questions.find(q => q.question_id === questionId);
        if (!question) return null;
        
        // Determine if we should update research_questions_array or direct questions
        if (questionId.includes('-q')) {
          // This is a batch question, update the batch
          const batchId = questionId.split('-q')[0];
          const questionIndex = parseInt(questionId.split('-q')[1]) - 1;
          
          // Get the current batch
          const { data: currentBatch, error: getBatchError } = await supabase
            .from('research_questions_array')
            .select('*')
            .eq('question_id', batchId)
            .single();
          
          if (getBatchError) {
            console.error('Error getting batch for update:', getBatchError);
            throw getBatchError;
          }
          
          if (currentBatch && currentBatch.questions) {
            // Update the specific question in the batch
            const updatedQuestions = [...currentBatch.questions];
            if (updatedQuestions[questionIndex]) {
              updatedQuestions[questionIndex].answer = answer;
              
              // Update the batch in the database
              const { error: updateError } = await supabase
                .from('research_questions_array')
                .update({
                  questions: updatedQuestions
                })
                .eq('question_id', batchId);
              
              if (updateError) {
                console.error('Error updating batch questions:', updateError);
                throw updateError;
              }
              
              return {
                question_id: questionId,
                answer
              };
            }
          }
        } else {
          // Direct question, update research_questions table if it exists
          try {
            const { error: updateError } = await supabase
              .from('research_questions')
              .update({
                answer,
                answered: true
              })
              .eq('question_id', questionId);
            
            if (updateError) {
              console.error('Error updating direct question:', updateError);
              // Don't throw here as the table might not exist
            }
            
            return {
              question_id: questionId,
              answer
            };
          } catch (updateErr) {
            console.error('Error in direct question update:', updateErr);
            // Continue with the next question
          }
        }
        
        return null;
      });
      
      // Wait for all submissions to complete
      const results = await Promise.all(allSubmissions);
      const successfulSubmissions = results.filter(Boolean);
      
      console.log(`Successfully submitted ${successfulSubmissions.length} answers`);
      
      if (successfulSubmissions.length > 0) {
        // Update the questions list with the new answers
        const updatedQuestions = questions.map(q => {
          const answer = answers[q.question_id];
          if (answer && answer.trim() !== '') {
            return { ...q, answer, answered: true };
          }
          return q;
        });
        
        setQuestions(updatedQuestions);
        
        // Clear answered questions from the form
        const remainingAnswers: Record<string, string> = {};
        Object.keys(answers).forEach(id => {
          const question = updatedQuestions.find(q => q.question_id === id);
          if (question && !question.answered) {
            remainingAnswers[id] = answers[id];
          }
        });
        setAnswers(remainingAnswers);
        
        console.log('All answers submitted successfully');
      } else {
        console.error('Failed to submit answers');
        // You could show an error message to the user here
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Render each question item
  const renderQuestion = ({ item }: { item: ResearchQuestion }) => {
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{item.question}</Text>
        
        {item.answered ? (
          <View style={styles.answerContainer}>
            <Text style={styles.answerLabel}>Your answer:</Text>
            <Text style={styles.answerText}>{item.answer}</Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your answer here..."
              value={answers[item.question_id] || ''}
              onChangeText={(text) => handleAnswerChange(item.question_id, text)}
              multiline
              editable={!submitting}
            />
          </View>
        )}
      </View>
    );
  };

  if (loading && questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No questions available yet. Questions will appear here as they are generated.
        </Text>
      </View>
    );
  }

  // Count unanswered questions
  const unansweredCount = questions.filter(q => !q.answered).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Research Questions</Text>
      <FlatList
        data={questions}
        renderItem={renderQuestion}
        keyExtractor={(item) => item.question_id}
        contentContainerStyle={styles.listContainer}
      />
      
      {unansweredCount > 0 && (
        <View style={styles.submitAllContainer}>
          <TouchableOpacity 
            style={[
              styles.submitAllButton, 
              submitting && styles.disabledButton
            ]}
            onPress={handleSubmitAll}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitAllButtonText}>
                Submit All Answers
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.questionsRemainingText}>
            {unansweredCount} question{unansweredCount !== 1 ? 's' : ''} remaining
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Add padding to make room for the submit button
  },
  questionContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  inputContainer: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitAllContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  submitAllButton: {
    backgroundColor: '#0066cc',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitAllButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  questionsRemainingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  answerContainer: {
    backgroundColor: '#e6f2ff',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  answerLabel: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 4,
    color: '#0066cc',
  },
  answerText: {
    fontSize: 16,
  },
});

export default ResearchQuestions; 
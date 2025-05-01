import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Pressable
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MotiView } from 'moti';
import { fetchQuestions, submitAllAnswers, monitorQuestions } from '../utils/questionsManager';
import { supabase } from '../utils/supabase';
import { BlurView } from 'expo-blur';
import config from '../utils/config';

// Updated color palette with blue focus
const COLORS = {
  midnightNavy: '#0A1128',      // Main background
  charcoalSmoke: '#2D3439',     // Card background
  glacialTeal: 'rgba(100, 255, 218, 0.7)', // Interactive elements
  accentBlue: '#3B82F6',        // Primary button color
  accentBlueGlow: 'rgba(59, 130, 246, 0.3)', // Button glow
  burnishedGold: '#FFC107',     // Highlights
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)', // Subtle alerts
  paleMoonlight: '#E0E0E0',     // Text and icons
  translucent: 'rgba(45, 52, 57, 0.75)'  // Translucent card color
};

// Enhanced glass morphic blur effect
const GlassMorphicBlur = ({ intensity = 50, tint = 'dark', style, children }: { 
  intensity?: number; 
  tint?: 'light' | 'dark' | 'default'; 
  style?: any; 
  children: React.ReactNode 
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint as 'light' | 'dark' | 'default'} style={style}>
        <View style={styles.glassInner}>
          {children}
        </View>
      </BlurView>
    );
  }
  
  // For Android, use a semi-transparent background
  return (
    <View style={[style, { backgroundColor: COLORS.translucent }]}>
      <View style={styles.glassInner}>
        {children}
      </View>
    </View>
  );
};

// Define types for the route params
type RouteParams = {
  research_id: string;
  query?: string;
  breadth?: number;
  depth?: number;
};

type ResearchQuestion = {
  question_id: string;
  research_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered: boolean;
  reply_webhook_url?: string;
  created_at: string;
};

const ResearchQuestionsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  
  // Get the research ID from the route params
  const { research_id, query } = route.params || {};
  
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hasQuestions, setHasQuestions] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation refs and states
  const submitButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const stopMonitoringRef = useRef<(() => void) | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation for the submit button pulse effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Load questions when the component mounts
  useEffect(() => {
    if (!research_id) {
      setError('No research ID provided');
      setLoading(false);
      return;
    }
    
    loadQuestions();
    
    // Setup real-time monitoring for questions
    const stopMonitoring = monitorQuestions(research_id, (updatedQuestions) => {
      setQuestions(updatedQuestions);
      
      // Update answers state with any new answers
      setAnswers(prev => {
        const newAnswers = { ...prev };
        updatedQuestions.forEach(q => {
          if (q.answer && !prev[q.question_id]) {
            newAnswers[q.question_id] = q.answer;
          }
        });
        return newAnswers;
      });
      
      setHasQuestions(updatedQuestions.length > 0);
    });
    
    stopMonitoringRef.current = stopMonitoring;
    
    // Cleanup on unmount
    return () => {
      if (stopMonitoringRef.current) {
        stopMonitoringRef.current();
      }
    };
  }, [research_id]);
  
  // Load initial questions
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const fetchedQuestions = await fetchQuestions(research_id);
      setQuestions(fetchedQuestions);
      
      // Initialize answers state with any existing answers
      const initialAnswers: Record<string, string> = {};
      fetchedQuestions.forEach(q => {
        if (q.answer) {
          initialAnswers[q.question_id] = q.answer;
        }
      });
      setAnswers(initialAnswers);
      
      setHasQuestions(fetchedQuestions.length > 0);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load questions. Please try again.');
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
  
  // Submit button press animation
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(submitButtonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(submitButtonOpacity, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(submitButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(submitButtonOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };
  
  // Submit all answers at once
  const handleSubmitAll = async () => {
    // Check if we have any answers to submit
    const hasAnswersToSubmit = Object.values(answers).some(answer => answer && answer.trim() !== '');
    if (!hasAnswersToSubmit) {
      Alert.alert('No Answers', 'Please answer at least one question before submitting.');
      return;
    }
    
    animateButtonPress();
    setSubmitting(true);
    setError(null);
    
    try {
      console.log(`Submitting answers for research ID: ${research_id}`);
      console.log('Raw answers to submit:', JSON.stringify(answers));
      
      // Debug question IDs format
      const questionIds = Object.keys(answers);
      console.log(`Question IDs in submission: ${questionIds.join(', ')}`);
      
      // Get any available questions from the database to double-check format
      const { data: batchData, error: batchError } = await supabase
        .from('research_questions_array')
        .select('*')
        .eq('research_id', research_id)
        .maybeSingle();
        
      if (batchData) {
        console.log(`Found question batch: ${batchData.question_id}`);
        console.log(`Batch contains ${batchData.questions?.length || 0} questions`);
        if (batchData.questions?.length > 0) {
          console.log(`Sample question ID format: ${batchData.questions[0].id}`);
        }
      } else if (batchError) {
        console.warn(`Error checking question batch: ${batchError.message}`);
      }
      
      const result = await submitAllAnswers(research_id, answers);
      
      if (result.success) {
        console.log('Successfully submitted answers');
        
        // Verbose logging to help with debugging
        if (result.data) {
          console.log('Submission result:', JSON.stringify(result.data));
          
          // Check if answers were actually saved
          const savedAnswers = result.data.answers || [];
          console.log(`Saved ${savedAnswers.length} answers to database`);
          
          if (savedAnswers.length > 0) {
            console.log('First saved answer:', JSON.stringify(savedAnswers[0]));
          }
        }
        
        // Update the questions list with the new answers
        const updatedQuestions = questions.map(q => {
          const answer = answers[q.question_id];
          if (answer && answer.trim() !== '') {
            return { ...q, answer, answered: true };
          }
          return q;
        });
        
        setQuestions(updatedQuestions);
        setSuccess(true);
        
        // Display success message
        Alert.alert(
          'Answers Submitted',
          'Your answers have been successfully submitted. Thank you!',
          [{ text: 'OK' }]
        );
        
        // Navigate to the research progress screen after a successful submission
        setTimeout(() => {
          navigation.navigate('ResearchProgressScreen' as never, { 
            research_id,
            query,
            breadth: route.params?.breadth || 3,
            depth: route.params?.depth || 3
          } as never);
        }, 2000);
      } else {
        console.error('Failed to submit answers:', result.error);
        setError('Failed to submit answers. Please try again.');
        
        // More detailed error message
        Alert.alert(
          'Submission Error',
          `Failed to submit answers: ${result.error?.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error submitting answers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`An unexpected error occurred: ${errorMessage}`);
      
      Alert.alert(
        'Unexpected Error',
        `There was a problem submitting your answers: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render each question item
  const renderQuestion = (question: ResearchQuestion, index: number) => {
    return (
      <MotiView
        key={question.question_id}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          opacity: { type: 'timing', duration: 300, delay: index * 100 },
          translateY: { type: 'timing', duration: 300, delay: index * 100 }
        }}
        style={styles.questionContainer}
      >
        <GlassMorphicBlur intensity={15} style={styles.glassCard}>
          <View style={styles.questionHeader}>
            <View style={styles.questionNumberContainer}>
              <Text style={styles.questionNumber}>Q{index + 1}</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your answer here..."
              placeholderTextColor="rgba(224, 224, 224, 0.5)"
              value={answers[question.question_id] || ''}
              onChangeText={(text) => handleAnswerChange(question.question_id, text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!submitting && !question.answered}
            />
          </View>
          
          {question.answered && (
            <View style={styles.answeredBadge}>
              <MaterialIcons name="check-circle" size={16} color={COLORS.glacialTeal} />
              <Text style={styles.answeredText}>Answered</Text>
            </View>
          )}
        </GlassMorphicBlur>
      </MotiView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[COLORS.midnightNavy, '#050A14']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Minimal Header with just back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.8)', 'rgba(45, 52, 57, 0.6)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Research Info */}
        {query && (
          <Text style={styles.queryText} numberOfLines={1}>"{query}"</Text>
        )}
        
        <View style={styles.headerRight} />
      </View>
      
      {/* Main Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                opacity: { type: 'timing', duration: 500 },
                scale: { type: 'timing', duration: 500 }
              }}
            >
              <GlassMorphicBlur intensity={20} style={styles.loadingCard}>
                <ActivityIndicator size="large" color={COLORS.glacialTeal} />
                <Text style={styles.loadingText}>Loading research questions...</Text>
              </GlassMorphicBlur>
            </MotiView>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                opacity: { type: 'timing', duration: 500 },
                scale: { type: 'timing', duration: 500 }
              }}
            >
              <GlassMorphicBlur intensity={20} style={styles.errorCard}>
                <MaterialIcons name="error-outline" size={48} color={COLORS.deepCoralGlow} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadQuestions}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </GlassMorphicBlur>
            </MotiView>
          </View>
        ) : !hasQuestions ? (
          <View style={styles.emptyContainer}>
            <MotiView
              from={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{
                opacity: { type: 'timing', duration: 1000, repeatReverse: true, loop: true }
              }}
              style={styles.loadingIndicator}
            >
              <GlassMorphicBlur intensity={20} style={styles.emptyCard}>
                <ActivityIndicator size="large" color={COLORS.glacialTeal} />
                <Text style={styles.emptyText}>
                  Please wait while we load questions...
                </Text>
                <MotiView
                  from={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    loop: true,
                    duration: 1000,
                  }}
                  style={styles.loadingIndicator}
                >
                  <MaterialIcons name="sync" size={24} color={COLORS.glacialTeal} />
                </MotiView>
              </GlassMorphicBlur>
            </MotiView>
          </View>
        ) : (
          <>
            <ScrollView 
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>Please answer the following questions:</Text>
              
              {questions.map((question, index) => renderQuestion(question, index))}
              
              <View style={styles.spacer} />
            </ScrollView>
            
            {/* Submit Button */}
            <View style={styles.submitContainer}>
              <GlassMorphicBlur intensity={20} style={styles.submitBlurContainer}>
                <Pressable
                  onPress={handleSubmitAll}
                  disabled={submitting || success}
                  style={({pressed}) => [
                    styles.submitButtonWrapper,
                    pressed && styles.submitButtonPressed
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.submitButton,
                      {
                        transform: [{ scale: submitButtonScale }],
                        opacity: submitButtonOpacity
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={submitting || success ? 
                        ['rgba(59, 130, 246, 0.7)', 'rgba(59, 130, 246, 0.5)'] : 
                        [COLORS.accentBlue, 'rgba(59, 130, 246, 0.8)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.submitGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color={COLORS.paleMoonlight} />
                      ) : success ? (
                        <View style={styles.successContainer}>
                          <MaterialIcons name="check-circle" size={20} color={COLORS.paleMoonlight} />
                          <Text style={styles.submitButtonText}>Answers Submitted!</Text>
                        </View>
                      ) : (
                        <View style={styles.submitContent}>
                          <Text style={styles.submitButtonText}>Submit All Answers</Text>
                          <Feather name="arrow-right" size={20} color={COLORS.paleMoonlight} />
                        </View>
                      )}
                    </LinearGradient>
                    
                    {/* Pulse effect around button */}
                    {!submitting && !success && (
                      <Animated.View
                        style={[
                          styles.buttonPulse,
                          {
                            opacity: pulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 0.4]
                            }),
                            transform: [
                              {
                                scale: pulseAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.12]
                                })
                              }
                            ]
                          }
                        ]}
                      />
                    )}
                  </Animated.View>
                </Pressable>
                
                <Text style={styles.noteText}>
                  Your answers help improve your research results.
                </Text>
              </GlassMorphicBlur>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.midnightNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 10,
    borderRadius: 30,
  },
  headerRight: {
    width: 44,
  },
  queryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.paleMoonlight,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    opacity: 0.9,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
    overflow: 'hidden',
    width: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.paleMoonlight,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 97, 0.2)',
    overflow: 'hidden',
    width: 300,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.paleMoonlight,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.accentBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    overflow: 'hidden',
    width: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.paleMoonlight,
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 16,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.paleMoonlight,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.9,
  },
  questionContainer: {
    marginBottom: 16,
  },
  glassCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  glassInner: {
    width: '100%',
    height: '100%',
  },
  questionHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  questionNumberContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accentBlue,
  },
  questionText: {
    fontSize: 16,
    color: COLORS.paleMoonlight,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    fontSize: 16,
    color: COLORS.paleMoonlight,
    padding: 14,
    minHeight: 100,
    backgroundColor: 'rgba(10, 17, 40, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  answeredText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.glacialTeal,
  },
  spacer: {
    height: 100,
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  submitBlurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    padding: 16,
  },
  submitButtonWrapper: {
    marginBottom: 10,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.paleMoonlight,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.accentBlue,
    borderRadius: 12,
  },
  noteText: {
    textAlign: 'center',
    color: 'rgba(224, 224, 224, 0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  loadingIndicator: {
    alignItems: 'center',
    marginTop: 10,
  },
});

export default ResearchQuestionsScreen; 
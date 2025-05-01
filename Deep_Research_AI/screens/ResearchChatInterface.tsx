import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  MaterialIcons, 
  Ionicons, 
  MaterialCommunityIcons,
  FontAwesome5,
  AntDesign
} from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView, MotiText } from 'moti';
import { toast } from 'sonner-native';
import { supabase } from '../context/supabase';

// Message types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

// Research topic type
interface ResearchTopic {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// Sample follow-up questions (will be replaced with API calls later)
const SAMPLE_QUESTIONS = [
  "What specific aspects of this topic interest you the most?",
  "Are there any particular time periods or geographical regions you'd like to focus on?",
  "What is your current level of knowledge in this area?",
  "Would you prefer theoretical analysis or practical applications?",
  "Are there any specific sources or authors you'd like to include or exclude?"
];

// Sample research topics for the demo (will be replaced with Supabase data)
const SAMPLE_TOPICS = [
  {
    id: '1',
    name: 'Quantum Computing Applications',
    relevance: 95,
    status: 'In Progress',
    estimatedCompletion: '10 minutes'
  },
  {
    id: '2',
    name: 'Machine Learning Integration',
    relevance: 87,
    status: 'Queued',
    estimatedCompletion: '15 minutes'
  },
  {
    id: '3',
    name: 'Algorithmic Efficiency',
    relevance: 79,
    status: 'Queued',
    estimatedCompletion: '20 minutes'
  }
];

// Message component for chat
const ChatMessage = ({ message, agentColors }) => {
  // Create safe message with default values to prevent undefined issues
  const safeMessage = {
    type: message?.type || MESSAGE_TYPES.SYSTEM,
    content: message?.content || "Message content unavailable",
    timestamp: message?.timestamp || new Date(),
    id: message?.id || Math.random().toString(36).substring(7)
  };
  
  const isAI = safeMessage.type === MESSAGE_TYPES.AI || safeMessage.type === MESSAGE_TYPES.QUESTION;
  const isSystem = safeMessage.type === MESSAGE_TYPES.SYSTEM;
  
  return (    <MotiView
      from={{ opacity: 0, translateY: 5 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: 100 }}
      style={[
        styles.messageContainer,
        isAI ? styles.aiMessageContainer : 
        isSystem ? styles.systemMessageContainer : styles.userMessageContainer
      ]}
    >
      {isAI && (
        <View style={[styles.avatarContainer, { backgroundColor: agentColors?.[0] || '#6c63ff' }]}>
          <Ionicons name="md-flask" size={16} color="#fff" />
        </View>
      )}
      
      {isSystem && (
        <View style={styles.systemAvatarContainer}>
          <MaterialIcons name="info-outline" size={16} color="#6c63ff" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isAI ? [styles.aiMessageBubble, { borderColor: agentColors?.[0] || '#6c63ff' }] : 
        isSystem ? styles.systemMessageBubble : styles.userMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          isSystem && styles.systemMessageText
        ]}>
          {safeMessage.content}
        </Text>
        <Text style={styles.timestampText}>
          {safeMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </MotiView>
  );
};

// Research Topic Item component
const ResearchTopicItem = ({ topic, index }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'Complete': return '#4CAF50';
      case 'In Progress': return '#2196F3';
      case 'Queued': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };
  
  return (    <MotiView
      from={{ opacity: 0, translateY: 5 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ 
        type: 'timing', 
        duration: 300,
        delay: index * 100 
      }}
      style={styles.topicItem}
    >
      <View style={styles.topicHeader}>
        <Text style={styles.topicName}>{topic.name}</Text>
        <View style={[styles.relevanceBadge, { backgroundColor: `rgba(108, 99, 255, ${topic.relevance/100})` }]}>
          <Text style={styles.relevanceText}>{topic.relevance}% relevance</Text>
        </View>
      </View>
      
      <View style={styles.topicFooter}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(topic.status)}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(topic.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(topic.status) }]}>{topic.status}</Text>
        </View>
        
        <Text style={styles.estimatedTime}>Est: {topic.estimatedCompletion}</Text>
      </View>
    </MotiView>
  );
};

export default function ResearchChatInterface() {
  const navigation = useNavigation();
  const route = useRoute();
  const { params } = route;
  
  // Get research parameters from navigation
  const agent = params?.agent || {
    name: 'Research Agent',
    id: 'default',
    colors: ['#3a1c71', '#6c63ff'],
    description: 'Default research assistant'
  };
  const query = params?.query || '';
  const breadth = params?.breadth || 3;
  const depth = params?.depth || 3;
  const includeTechnicalTerms = params?.includeTechnicalTerms || false;
  const outputType = params?.outputType || 'Research Paper';
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Q&A state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAskingQuestions, setIsAskingQuestions] = useState(true);
  const [answers, setAnswers] = useState({});
  
  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [researchTopics, setResearchTopics] = useState<ResearchTopic[]>([]);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStatus, setResearchStatus] = useState('Starting research...');
  const [currentResearchId, setCurrentResearchId] = useState<string | null>(null);
  const [researchComplete, setResearchComplete] = useState(false);
  const [resultsAvailable, setResultsAvailable] = useState(false);
  
  const flatListRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;  // Initialize chat with welcome message including research parameters
  useEffect(() => {    const initialMessages = [
      {
        id: '1',
        type: MESSAGE_TYPES.SYSTEM,
        content: `📝 Research Parameters:\n\nQuery: ${query}\nResearch Breadth: ${breadth}\nResearch Depth: ${depth}\nInclude Technical Terms: ${includeTechnicalTerms ? 'Yes' : 'No'}\nOutput Format: ${outputType}\n\nStarting research process. To begin, ${SAMPLE_QUESTIONS[0]}`,
        timestamp: new Date(),
      }
    ];
    
    setMessages(initialMessages);
  }, [query, breadth, depth, outputType]);
  
  // Animate research progress
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: researchProgress,
      duration: 600,
      useNativeDriver: false
    }).start();
  }, [researchProgress]);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  
  // Monitor for research results when research is complete
  useEffect(() => {
    if (!currentResearchId || !researchComplete) return;

    console.log(`Setting up real-time monitoring for research results: ${currentResearchId}`);

    // Set up subscription for research results
    const subscription = supabase
      .channel(`chat-results-${currentResearchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'research_results_new',
        filter: `research_id=eq.${currentResearchId}`
      }, (payload) => {
        console.log('Research result update received:', payload);
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          console.log('Research results are available');
          setResultsAvailable(true);
        }
      })
      .subscribe();

    // Check if results already exist
    const checkExistingResults = async () => {
      try {
        const { data, error } = await supabase
          .from('research_results_new')
          .select('result_id')
          .eq('research_id', currentResearchId)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log('Existing results found');
          setResultsAvailable(true);
        }
      } catch (err) {
        console.error('Error checking for existing results:', err);
      }
    };
    
    checkExistingResults();

    return () => {
      console.log('Cleaning up research results subscription');
      supabase.removeChannel(subscription);
    };
  }, [currentResearchId, researchComplete]);
  
  // Handle submitting answer to follow-up question
  const submitAnswer = async () => {
    if (!inputText.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    // Add answer message
    const answerMessage = {
      id: Date.now().toString(),
      type: MESSAGE_TYPES.ANSWER,
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, answerMessage]);
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: inputText.trim()
    }));
    setInputText('');
    
    // Simulate processing delay
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);

    if (currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
      // Show next question
      const nextQuestion = {
        id: (Date.now() + 1).toString(),
        type: MESSAGE_TYPES.QUESTION,
        content: SAMPLE_QUESTIONS[currentQuestionIndex + 1],
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, nextQuestion]);
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered
      const completionMessage = {
        id: Date.now().toString(),
        type: MESSAGE_TYPES.SYSTEM,
        content: "Thank you for providing those details. I'll now proceed with the comprehensive research based on your responses.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, completionMessage]);
      setIsAskingQuestions(false);
      
      // Begin research process
      startResearchProcess();
    }
  };
  
  // Start the research process after Q&A
  const startResearchProcess = async () => {
    setIsResearching(true);
    
    try {
      // Add processing message
      const processingMessage = {
        id: Date.now().toString(),
        type: MESSAGE_TYPES.AI,
        content: `Analyzing your query: "${query}" with the parameters you've specified. I'll identify key research areas and begin gathering information.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      // Simulate research process
      await simulateResearchProcess();
      
      // Show the topics once research is complete
      setShowTopics(true);
      
      // Add summary message
      const summaryMessage = {
        id: Date.now().toString(),
        type: MESSAGE_TYPES.AI,
        content: `I've identified several key research areas related to your query. The analysis is now in progress. You can view the topics and their status below. Feel free to ask any questions about the research.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, summaryMessage]);
      
    } catch (error) {
      console.error('Research error:', error);
      toast.error('An error occurred during research');
      
      const errorMessage = {
        id: Date.now().toString(),
        type: MESSAGE_TYPES.SYSTEM,
        content: "There was a problem processing your research. Please try again later or modify your query.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsResearching(false);
    }
  };
  
  // Simulate research process with updates
  const simulateResearchProcess = async () => {
    // Step 1: Initializing (0-20%)
    setResearchStatus('Initializing research framework');
    for (let i = 0; i <= 20; i += 5) {
      setResearchProgress(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 2: Identifying topics (20-40%)
    setResearchStatus('Identifying key research topics');
    for (let i = 25; i <= 40; i += 5) {
      setResearchProgress(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 3: Gathering data (40-70%)
    setResearchStatus('Gathering and analyzing relevant data');
    for (let i = 45; i <= 70; i += 5) {
      setResearchProgress(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 4: Processing (70-90%)
    setResearchStatus('Processing information');
    for (let i = 75; i <= 90; i += 5) {
      setResearchProgress(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 5: Finalizing (90-100%)
    setResearchStatus('Finalizing research structure');
    for (let i = 95; i <= 100; i += 5) {
      setResearchProgress(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Set research topics
    setResearchTopics(SAMPLE_TOPICS);
    setResearchStatus('Research in progress');
  };
  
  // Send followup question during research
  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: MESSAGE_TYPES.USER,
      content: inputText.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate AI response after a delay
    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1000).toString(),
        type: MESSAGE_TYPES.AI,
        content: generateAIResponse(inputText, agent.name),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
    
    setInputText('');
  };
  
  // Generate AI response
  const generateAIResponse = (query, agentName) => {
    const responses = [
      `Based on your question about "${query}", I can tell you that the research is progressing well. I'm currently focusing on analyzing the most relevant sources and extracting key information.`,
      `I'm currently exploring "${query}" in depth. This is an interesting area that connects with several of the topics I've identified. Would you like me to prioritize this aspect in the research?`,
      `Great question about "${query}". This relates to the broader context of your research. I'm incorporating this perspective into the analysis to ensure comprehensive coverage.`,
      `Regarding "${query}", I've found several authoritative sources with relevant information. This will definitely enhance the quality of your research output.`,
      `Your question about "${query}" touches on an important aspect that I'm currently researching. The preliminary findings suggest some fascinating connections that will be included in your final report.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };
  
  // Handle research completion
  const handleResearchComplete = () => {
    setResearchComplete(true);
    setResearchProgress(100);
    setResearchStatus('Research complete!');
    
    // Toast notification
    toast.success('Research complete! View results');
  };
  
  // Navigate to results screen
  const viewResearchResults = () => {
    if (!currentResearchId) return;
    
    console.log(`Navigating to results screen for research ID: ${currentResearchId}`);
    // Navigate to results screen with both parameter formats for compatibility
    navigation.navigate('ResearchResultScreen', {
      researchId: currentResearchId,
      research_id: currentResearchId
    });
  };
  
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Create a new message
    const newMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    // Clear input and add user message to chat
    setInputText('');
    setMessages(prev => [...prev, newMessage]);
    
    // Auto scroll to bottom
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    
    // Process user message and get response
    try {
      // Check if this is a research command
      if (inputText.toLowerCase().includes('research') || 
          inputText.toLowerCase().includes('investigate') ||
          inputText.toLowerCase().includes('find information')) {
        setIsResearching(true);
        
        // Generate a research ID
        const newResearchId = `research-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        setCurrentResearchId(newResearchId);
        
        // Simulate research progress
        simulateResearchProgress();
        
        // Add response indicating research has begun
        const researchResponse: Message = {
          id: `assistant-${Date.now()}`,
          text: `I'll research "${inputText}" for you. This might take a few minutes.`,
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, researchResponse]);
        }, 1000);
        
        return;
      }
      
      // Check if message contains a research completion notification
      if (inputText.toLowerCase().includes('research complete') || 
          inputText.toLowerCase().includes('finished researching')) {
        
        // Extract potential research ID
        const idMatch = inputText.match(/research-\d+-\d+/);
        if (idMatch && idMatch[0]) {
          const extractedId = idMatch[0];
          console.log(`Detected research completion for ID: ${extractedId}`);
          
          // Update state for research completion
          setCurrentResearchId(extractedId);
          handleResearchComplete();
          
          // Add assistant acknowledgment
          const completionResponse: Message = {
            id: `assistant-${Date.now()}`,
            text: `Great! I've completed the research. You can now view the detailed results.`,
            sender: 'assistant',
            timestamp: new Date()
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, completionResponse]);
          }, 500);
          
          return;
        }
      }
      
      // Show typing indicator
      setIsTyping(true);
      
      // Get regular chat response
      const response = await getAssistantResponse(inputText);
      
      // Create assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        text: response,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      // Wait a bit before showing response
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto scroll to bottom again after response
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }, 1000);
      
    } catch (error) {
      console.error('Error getting response:', error);
      setIsTyping(false);
      
      // Show error message
      toast.error('Something went wrong. Please try again.');
    }
  };
  
  // Simulate research progress
  const simulateResearchProgress = () => {
    // Reset progress
    setResearchProgress(0);
    setResearchStatus('Starting research...');
    setResearchComplete(false);
    setResultsAvailable(false);
    
    // Generate some sample research topics
    const sampleTopics: ResearchTopic[] = [
      { id: '1', title: 'Background Information', status: 'pending' },
      { id: '2', title: 'Key Concepts', status: 'pending' },
      { id: '3', title: 'Recent Developments', status: 'pending' },
      { id: '4', title: 'Expert Perspectives', status: 'pending' },
      { id: '5', title: 'Related Studies', status: 'pending' }
    ];
    
    setResearchTopics(sampleTopics);
    setShowTopics(true);
    
    // Simulate progress updates
    let progress = 0;
    const statuses = [
      'Starting research...',
      'Gathering initial information...',
      'Analyzing sources...',
      'Compiling research findings...',
      'Reviewing information quality...',
      'Finalizing research report...',
      'Research complete!'
    ];
    
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Mark research as complete
        handleResearchComplete();
        
        // Update topics
        const updatedTopics = [...sampleTopics].map(topic => ({
          ...topic,
          status: 'completed'
        }));
        setResearchTopics(updatedTopics);
      } else {
        // Update status text occasionally
        const statusIndex = Math.min(
          Math.floor(progress / (100 / statuses.length)),
          statuses.length - 1
        );
        setResearchStatus(statuses[statusIndex]);
        
        // Update topics progressively
        if (progress > 20) {
          const updatedTopics = [...sampleTopics];
          const completedCount = Math.floor((progress / 100) * updatedTopics.length);
          
          updatedTopics.forEach((topic, index) => {
            if (index < completedCount) {
              updatedTopics[index] = { ...topic, status: 'completed' };
            } else if (index === completedCount) {
              updatedTopics[index] = { ...topic, status: 'in_progress' };
            }
          });
          
          setResearchTopics(updatedTopics);
        }
      }
      
      setResearchProgress(progress);
    }, 1000);
    
    return () => clearInterval(interval);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Glow Effects */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />
      
      {/* Header */}
      <LinearGradient
        colors={agent?.colors || ['#3a1c71', '#6c63ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerLogoContainer}>
          <MaterialIcons name="science" size={24} color="#fff" />
          <Text style={styles.headerLogoText}>Royal Research</Text>
        </View>
        
        <View style={styles.rightPlaceholder} />
      </LinearGradient>
      
      {/* Agent Info */}
      <View style={styles.agentInfoContainer}>
        <View style={[styles.agentIconContainer, { backgroundColor: agent?.colors?.[0] }]}>
          {agent?.icon || <FontAwesome5 name="robot" size={24} color="#fff" />}
        </View>
        <View style={styles.agentDetails}>
          <Text style={styles.agentName}>Research Agent</Text>          <Text style={styles.agentText}>{`Query: ${query}`}</Text>
        </View>
      </View>      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.contentContainer}>
          {/* Chat Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <ChatMessage 
                message={item} 
                agentColors={agent?.colors || ['#3a1c71', '#6c63ff']} 
              />
            )}
            keyExtractor={item => item?.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.chatList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
          
          {/* Research Progress Indicator */}
          {isResearching && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressTitle}>Research Progress</Text>
              <Text style={styles.progressStatus}>{researchStatus}</Text>
              
              <View style={styles.progressBarContainer}>
                <Animated.View 
                  style={[
                    styles.progressBar,
                    { width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    }) }
                  ]}
                >
                  <LinearGradient
                    colors={agent?.colors || ['#3a1c71', '#6c63ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>
              
              <Text style={styles.progressPercentage}>
                {Math.round(researchProgress)}%
              </Text>
              
              {researchComplete && (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 500 }}
                  style={styles.resultsButtonContainer}
                >
                  <TouchableOpacity
                    style={styles.viewResultsButton}
                    onPress={viewResearchResults}
                  >
                    {!resultsAvailable ? (
                      <View style={styles.buttonContent}>
                        <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.viewResultsText}>Preparing Results...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <MaterialIcons name="assignment-turned-in" size={18} color="#fff" />
                        <Text style={styles.viewResultsText}>View Research Results</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </MotiView>
              )}
            </View>
          )}
          
          {/* Research Topics */}
          {showTopics && (
            <View style={styles.topicsContainer}>
              <View style={styles.topicsHeader}>
                <Text style={styles.topicsTitle}>Research Topics</Text>
                <View style={styles.refreshButton}>
                  <AntDesign name="sync" size={18} color="#6c63ff" />
                </View>
              </View>
              
              {researchTopics.map((topic, index) => (
                <ResearchTopicItem 
                  key={topic.id} 
                  topic={topic} 
                  index={index} 
                />
              ))}
            </View>
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingIndicator, { backgroundColor: agent?.colors?.[0] || '#3a1c71' }]}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
              <Text style={styles.loadingText}>Processing your response...</Text>
            </View>
          )}
        </View>        {/* Input Area */}
        <View style={styles.floatingInputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={isAskingQuestions ? "Type your answer..." : "Ask a question about the research..."}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxHeight={100}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled
              ]}
              onPress={isAskingQuestions ? submitAnswer : sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <LinearGradient
                colors={inputText.trim() && !isLoading ? ['#00D4FF', '#6c63ff'] : ['rgba(204, 204, 204, 0.3)', 'rgba(170, 170, 170, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark navy background for futuristic theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.2)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    padding: 6,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  rightPlaceholder: {
    width: 36,
  },  agentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  agentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  agentDetails: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  agentText: {
    fontSize: 14,
    color: '#9eeafc',
    fontStyle: 'italic',
  },  chatList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  systemMessageContainer: {
    justifyContent: 'center',
  },  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  systemAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    marginRight: 8,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  aiMessageBubble: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)', // Semi-transparent dark background for glassmorphic effect
    borderWidth: 1,
    borderColor: '#6c63ff',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  userMessageBubble: {
    backgroundColor: 'rgba(108, 99, 255, 0.8)',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  systemMessageBubble: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderRadius: 12,
    alignSelf: 'center',
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.2)',
  },
  messageText: {
    fontSize: 15,
    color: '#fff', // White text for better contrast on dark backgrounds
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  systemMessageText: {
    color: '#9eeafc',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },  timestampText: {
    fontSize: 10,
    color: 'rgba(158, 234, 252, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '500',
  },  progressContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  progressStatus: {
    fontSize: 14,
    color: '#9eeafc',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(158, 234, 252, 0.2)',
  },
  progressBar: {
    height: '100%',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  progressGradient: {
    height: '100%',
    width: '100%',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#9eeafc',
    textAlign: 'right',
    fontWeight: '500',
  },  topicsContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  topicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.2)',
    paddingBottom: 8,
  },
  topicsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(158, 234, 252, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(158, 234, 252, 0.3)',
    shadowColor: '#9eeafc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },  topicItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(158, 234, 252, 0.1)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textShadowColor: 'rgba(158, 234, 252, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  relevanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  relevanceText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#9eeafc',
    fontWeight: '500',
  },  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.2)',
  },
  loadingIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    color: '#9eeafc',
    fontWeight: '500',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },  keyboardAvoidView: {
    flex: 1,
  },  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  // Background glow effects for futuristic appearance
  bgGlow1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4A00E0',
    top: -100,
    left: -150,
    opacity: 0.15,
  },
  bgGlow2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#00D4FF',
    bottom: 50,
    right: -100,
    opacity: 0.12,
  },    floatingInputWrapper: {
      backgroundColor: '#1E293B',
      borderTopWidth: 1,
      borderTopColor: '#334155',
    },    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#1E293B',
    },    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#334155',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#293548',
      fontSize: 16,
      maxHeight: 100,
      minHeight: 40,
      color: '#fff',
    },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  viewResultsButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewResultsText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
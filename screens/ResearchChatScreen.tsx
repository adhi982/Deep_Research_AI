import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Modal,
  Animated,
  Pressable,
  Keyboard,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  MaterialIcons, 
  Ionicons, 
  Feather, 
  MaterialCommunityIcons,
  AntDesign,
  FontAwesome5
} from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView, MotiText } from 'moti';
import { toast } from 'sonner-native';
import ResearchQuestions from '../components/ResearchQuestions';
import { generateEntityId, generateResearchId } from '../utils/supabase';

// Message types
const MESSAGE_TYPES = {
  SYSTEM: 'system',
  USER: 'user',
  AI: 'ai',
  QUESTION: 'question',
  ANSWER: 'answer',
};

// Sample follow-up questions (will be replaced with API calls later)
const SAMPLE_QUESTIONS = [
  "What specific aspects of this topic interest you the most?",
  "Are there any particular time periods or geographical regions you'd like to focus on?",
  "What is your current level of knowledge in this area?",
  "Would you prefer theoretical analysis or practical applications?"
];

// Output type options
const OUTPUT_TYPES = [
  'Essay',
  'Blog',
  'Research Paper',
  'News',
  'Literature Review',
  'Case Study',
  'Comparative Analysis',
  'Social Media Post'
];

// Initial messages
const initialMessages = [
  {
    id: '1',
    type: MESSAGE_TYPES.SYSTEM,
    content: 'Research session started. Configure your parameters and submit a research query to begin.',
    timestamp: new Date(),
  },
];

// Enhanced Interactive Slider Component
const CustomSlider = ({ 
  value, 
  onValueChange, 
  min = 1, 
  max = 5, 
  label,
  colors 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animate value changes
  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: ((value - min) / (max - min)) * 100,
      friction: 7,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [value, min, max]);

  // Pulse animation for stops
  useEffect(() => {
    if (isDragging) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isDragging]);

  // Handle start dragging
  const handlePressIn = () => {
    setIsDragging(true);
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Handle end dragging
  const handlePressOut = () => {
    setIsDragging(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Handle value change with haptic feedback
  const handleValueChange = (newValue) => {
    const roundedValue = Math.max(min, Math.min(max, Math.round(newValue)));
    if (roundedValue !== localValue) {
      setLocalValue(roundedValue);
      // Add haptic feedback here if needed
    }
  };

  // Generate stops with animations
  const stops = useMemo(() => {
    const stopsArray = [];
    for (let i = min; i <= max; i++) {
      stopsArray.push(i);
    }
    return stopsArray;
  }, [min, max]);
  
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: 300 }}
      style={styles.sliderContainer}
    >
      <View style={styles.sliderLabelContainer}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Animated.View 
          style={[
            styles.valueBadge,
            { 
              backgroundColor: colors[0],
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.valueText}>{value}</Text>
        </Animated.View>
      </View>
      
      <View style={styles.sliderTrackContainer}>
        {/* Background Gradient */}
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.sliderTrackGradient}
        />
        
        {/* Active Track */}
        <View style={styles.sliderTrack}>
          <Animated.View 
            style={[
              styles.sliderFill,
              {
                width: animatedValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]}
          >
            <LinearGradient
              colors={colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fillGradient}
            />
          </Animated.View>
        </View>
        
        {/* Stops */}
        <View style={styles.stopsContainer}>
          {stops.map((stop) => {
            const isActive = stop <= value;
            const isCurrentValue = stop === value;
            
            return (
              <TouchableOpacity 
                key={stop}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => {
                  handleValueChange(stop);
                  onValueChange(stop);
                }}
              >
                <Animated.View
                  style={[
                    styles.stop,
                    isActive && { backgroundColor: colors[0] },
                    isCurrentValue && {
                      transform: [{ scale: pulseAnim }],
                      shadowColor: colors[0],
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
                    }
                  ]}
                >
                  <Animated.Text
                    style={[
                      styles.stopText,
                      {
                        color: isActive ? '#fff' : '#666',
                        transform: [{ 
                          scale: isCurrentValue ? pulseAnim : 1
                        }]
                      }
                    ]}
                  >
                    {stop}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </MotiView>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ value, onToggle, label, colors }) => {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;
  
  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 20 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);
  
  return (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>{label}</Text>
      
      <View style={styles.toggleOuter}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggle}
          style={[
            styles.toggleSwitch,
            { backgroundColor: value ? colors[0] : '#ccc' }
          ]}
        >
          <Animated.View 
            style={[
              styles.toggleThumb,
              { transform: [{ translateX }] }
            ]}
          >
            <Text style={styles.toggleIcon}>
              {value ? 'Y' : 'N'}
            </Text>
          </Animated.View>
        </TouchableOpacity>
        
        <Text style={styles.toggleStateText}>
          {value ? 'Yes' : 'No'}
        </Text>
      </View>
    </View>
  );
};

// Dropdown Component
const Dropdown = ({ value, options, onSelect, label, colors }) => {
  const [isVisible, setIsVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => setIsVisible(true)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[
          styles.dropdownTrigger,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <LinearGradient
            colors={[...colors.map(c => `${c}20`), ...colors.map(c => `${c}10`)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dropdownButton}
          >
            <Text style={[styles.dropdownButtonText, { color: colors[0] }]}>
              {value || 'Select...'}
            </Text>
            <MaterialIcons 
              name="arrow-drop-down" 
              size={20} 
              color={colors[0]}
              style={styles.dropdownIcon}
            />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
      
      <Modal
        visible={isVisible}
        transparent={true}
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            exit={{ opacity: 0, scale: 0.9, translateY: 20 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.optionsContainer}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option, index) => (
                <MotiView
                  key={index}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: index * 50 }}
                >
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      value === option && {
                        backgroundColor: `${colors[0]}10`,
                      }
                    ]}
                    onPress={() => {
                      onSelect(option);
                      setIsVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      value === option && { color: colors[0], fontWeight: '600' }
                    ]}>
                      {option}
                    </Text>
                    {value === option && (
                      <MaterialIcons 
                        name="check" 
                        size={20} 
                        color={colors[0]} 
                      />
                    )}
                  </TouchableOpacity>
                </MotiView>
              ))}
            </ScrollView>
          </MotiView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

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
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
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

export default function ResearchChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get parameters from route if available
  const routeParams = route.params || {};
  const providedQuery = routeParams.query || '';
  const providedResearchId = routeParams.research_id;
  const providedAgent = routeParams.agent;
  const providedBreadth = routeParams.breadth;
  const providedDepth = routeParams.depth;
  const providedIncludeTechnicalTerms = routeParams.includeTechnicalTerms;
  const providedOutputType = routeParams.outputType;
  
  // Skip parameters screen if all parameters are provided
  const hasAllParameters = providedQuery && 
                          providedBreadth !== undefined && 
                          providedDepth !== undefined &&
                          providedIncludeTechnicalTerms !== undefined &&
                          providedOutputType;
  
  // State for research parameters
  const [agent, setAgent] = useState(providedAgent || null);
  const [researchId, setResearchId] = useState(providedResearchId || null);
  const [query, setQuery] = useState(providedQuery || '');
  const [breadth, setBreadth] = useState(providedBreadth || 3);
  const [depth, setDepth] = useState(providedDepth || 3);
  const [includeTechnicalTerms, setIncludeTechnicalTerms] = useState(providedIncludeTechnicalTerms !== undefined ? providedIncludeTechnicalTerms : false);
  const [outputType, setOutputType] = useState(providedOutputType || 'Research Paper');
  
  // State for UI management
  const [messages, setMessages] = useState(initialMessages);
  const [showParameters, setShowParameters] = useState(!hasAllParameters);
  const [isResearching, setIsResearching] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState<boolean>(true);
  const [showOutputTypeModal, setShowOutputTypeModal] = useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [researchTopics, setResearchTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  
  // Animation refs
  const queryInputRef = useRef(null);
  const queryInputPosition = useRef(new Animated.Value(0)).current;
  const inputOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  
  // Add state for managing questions
  const [hasQuestions, setHasQuestions] = useState<boolean>(false);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState<boolean>(true);
  const [loadingQuestionsMessage, setLoadingQuestionsMessage] = useState('Processing your research query...');
  const [research_id, setResearch_id] = useState<string>(providedResearchId || generateResearchId());
  
  // First, add a state for the fullscreen questions modal
  const [showFullscreenQuestions, setShowFullscreenQuestions] = useState<boolean>(false);
  
  // Start research automatically if all parameters are provided
  useEffect(() => {
    if (hasAllParameters && providedQuery) {
      handleStartResearch();
    }
    
    // Set research_id when the component mounts if not already provided
    if (!providedResearchId) {
      setResearch_id(generateResearchId());
    }
  }, []);
  
  // SendButton component with animations
const SendButton = ({ onPress, disabled }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(disabled ? 0.5 : 1)).current;
  
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: disabled ? 0.5 : 1,
      duration: 150,
      useNativeDriver: true
    }).start();
  }, [disabled]);
  
  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 5,
      tension: 300,
      useNativeDriver: true
    }).start();
  };
  
  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 400,
      useNativeDriver: true
    }).start();
  };
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View 
        style={[
          styles.sendButton,
          { 
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#6c63ff', '#8E2DE2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendButtonGradient}
        >
          <MaterialIcons 
            name="send" 
            size={18} 
            color="#fff" 
          />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Handle starting research
const handleStartResearch = () => {
  // Validate query
  if (!query.trim()) {
    setQueryError('Please enter a research query');
    queryInputRef.current?.focus();
    return;
  }
  
  setQueryError('');
  
  // Prepare research parameters
  const researchParams = {
    query: query.trim(),
    breadth,
    depth,
    includeTechnicalTerms,
    outputType,
    agent,
  };
  
  // Dismiss keyboard
  Keyboard.dismiss();
  
  // Ensure questions are visible after submitting query
  setShowQuestions(true);
  
  // Navigate to ResearchChatInterface with parameters
  navigation.navigate('ResearchChatInterface', researchParams);
};
  
  // Render header with app logo centered
  const renderHeader = () => (
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
  );

  // Handle follow-up question or message
  const handleSendMessage = () => {
    if (!query.trim()) {
      setQueryError('Please enter a question');
      return;
    }
    
    setQueryError('');
    
    // Add user message to chat
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    
    // Add this message to the chat
    setChatMessages([...chatMessages, userMessage]);
    
    // Clear input
    setQuery('');
    
    // TODO: Send this message to the research service
    // This would connect to your webhook/backend
    
    // For now, just show a simulated response
    setTimeout(() => {
      const aiResponse = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: 'I\'m processing your question. The research is still in progress...',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  // Handle questions loaded callback
  const handleQuestionsLoaded = (hasLoadedQuestions: boolean) => {
    console.log(`Questions loaded: ${hasLoadedQuestions ? 'yes' : 'no'}`);
    setHasQuestions(hasLoadedQuestions);
    setIsQuestionsLoading(false);
    
    // If no questions were found, update the loading message
    if (!hasLoadedQuestions && !isQuestionsLoading) {
      setLoadingQuestionsMessage('No questions available yet. Questions will appear as they are generated.');
    }
  };
  
  // Toggle questions visibility
  const toggleQuestions = () => {
    setShowQuestions(prev => !prev);
  };

  // Add button to toggle questions in the header right
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ 
            marginRight: 15, 
            padding: 8,
            backgroundColor: showQuestions ? 'rgba(108, 99, 255, 0.2)' : 'transparent',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(108, 99, 255, 0.4)',
          }}
          onPress={toggleQuestions}
        >
          <Text style={{ 
            color: '#ffffff', 
            fontWeight: 'bold', 
            fontSize: 16,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
            {showQuestions ? 'Hide Questions' : hasQuestions ? 'Show Questions' : 'Questions'}
          </Text>
          {hasQuestions && !showQuestions && (
            <View 
              style={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                width: 10, 
                height: 10, 
                borderRadius: 5, 
                backgroundColor: '#ff6b6b' 
              }} 
            />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, showQuestions, hasQuestions]);

  // Add a function to toggle fullscreen questions view
  const toggleFullscreenQuestions = () => {
    setShowFullscreenQuestions(prev => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background glow effects */}
      <View style={styles.backgroundElements}>
        {/* Background elements can be added here */}
      </View>
      
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerLogoContainer}>
          <MaterialIcons name="science" size={24} color="white" />
          <Text style={styles.headerLogoText}>Royal Research</Text>
        </View>
        
        <View style={styles.rightPlaceholder} />
      </LinearGradient>

      <View style={styles.agentInfoContainer}>
        <LinearGradient
          colors={agent?.colors || ['#3a1c71', '#6c63ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.agentIconGradient}
        >
          {agent?.icon || <MaterialCommunityIcons name="robot" size={24} color="white" />}
        </LinearGradient>
        <View style={styles.agentTextContainer}>
          <Text style={styles.agentName}>{agent?.name || 'Research Assistant'}</Text>
          <Text style={styles.agentDescription}>
            {agent?.description || 'Helping you with your research needs'}
          </Text>
        </View>
      </View>
      
      {/* Only show the parameters UI if we don't have all parameters from the previous screen */}
      {!hasAllParameters && (
      <View style={styles.parametersSection}>
        <View style={styles.parametersContent}>
          <Text style={styles.parametersTitle}>Research Parameters</Text>
          
          <CustomSlider 
            value={breadth} 
            onValueChange={setBreadth} 
            label="Research Breadth" 
            colors={agent?.colors || ['#3a1c71', '#6c63ff']}
          />
          
          <CustomSlider 
            value={depth} 
            onValueChange={setDepth} 
            label="Research Depth" 
            colors={agent?.colors || ['#3a1c71', '#6c63ff']}
          />
          
          <ToggleSwitch 
            value={includeTechnicalTerms} 
            onToggle={() => setIncludeTechnicalTerms(!includeTechnicalTerms)} 
            label="Include Technical Terms" 
            colors={agent?.colors || ['#3a1c71', '#6c63ff']}
          />
          
          <Dropdown 
            value={outputType} 
            options={OUTPUT_TYPES} 
            onSelect={setOutputType} 
            label="Output Format" 
            colors={agent?.colors || ['#3a1c71', '#6c63ff']}
          />
        </View>
      </View>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.contentContainer}>
          {/* Chat messages will go here */}
          {isResearching && (
            <View style={styles.researchProgressContainer}>
              <Text style={styles.researchingText}>Researching: {currentTopic || query}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}% complete</Text>
            </View>
          )}
          
          {/* If we have all parameters from the previous screen, show a message confirming we received the query */}
          {hasAllParameters && !isResearching && (
            <View style={styles.confirmationContainer}>
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500 }}
                style={styles.confirmationCard}
              >
                <MaterialIcons name="check-circle" size={40} color="#4ade80" style={styles.confirmationIcon} />
                <Text style={styles.confirmationTitle}>Research Query Received</Text>
                <Text style={styles.confirmationQuery}>"{query}"</Text>
                <Text style={styles.confirmationParams}>
                  Breadth: {breadth} • Depth: {depth} • 
                  {includeTechnicalTerms ? ' With' : ' Without'} Technical Terms • 
                  Format: {outputType}
                </Text>
                <Text style={styles.confirmationMessage}>Your research is being processed...</Text>
                
                {/* Add a prominent button to answer questions */}
                {hasQuestions && (
                  <TouchableOpacity 
                    style={styles.answerQuestionsButton}
                    onPress={toggleFullscreenQuestions}
                  >
                    <LinearGradient
                      colors={['#6c63ff', '#8E2DE2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.answerQuestionsGradient}
                    >
                      <View style={styles.answerQuestionsButtonContent}>
                        <MaterialIcons name="question-answer" size={20} color="#fff" />
                        <Text style={styles.answerQuestionsButtonText}>
                          Answer Research Questions
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* View Progress Button - only show if research is in progress */}
                {currentResearchId && (
                  <TouchableOpacity
                    style={styles.viewProgressButton}
                    onPress={() => navigation.navigate('ResearchProgressScreen', {
                      research_id: currentResearchId,
                      query: query,
                      breadth,
                      depth
                    })}
                  >
                    <LinearGradient
                      colors={['#6366F1', '#4F46E5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.viewProgressGradient}
                    >
                      <MaterialIcons name="insights" size={18} color="#fff" />
                      <Text style={styles.viewProgressText}>View Progress</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </MotiView>
            </View>
          )}
        </View>
        
        {/* Input Box at Bottom - Only show if we don't have parameters or if research is in progress */}
        {(!hasAllParameters || isResearching) && (
        <Animated.View 
          style={[
            styles.inputContainer,
            {
              transform: [{ translateY: queryInputPosition }],
              opacity: inputOpacity
            }
          ]}
        >
          <View style={styles.floatingInputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={queryInputRef}
                style={styles.queryInput}
                  placeholder={hasAllParameters ? "Ask a follow-up question..." : "Type your query..."}
                value={query}
                onChangeText={setQuery}
                multiline
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
              <SendButton 
                  onPress={hasAllParameters ? handleSendMessage : handleStartResearch}
                disabled={!query.trim()}
              />
            </View>
            {queryError ? (
              <Text style={styles.errorText}>{queryError}</Text>
            ) : null}
          </View>
        </Animated.View>
        )}
      </KeyboardAvoidingView>
      
      {/* Show questions section if enabled */}
      {showQuestions && (
        <MotiView 
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={[
            styles.questionsContainer,
            { maxHeight: Dimensions.get('window').height * 0.6 } // Limit height to 60% of screen
          ]}
        >
          {isQuestionsLoading ? (
            <View style={styles.questionsLoadingContainer}>
              <ActivityIndicator size="large" color="#6c63ff" />
              <Text style={styles.questionsLoadingText}>
                {loadingQuestionsMessage}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.questionsHeaderContainer}>
                <Text style={styles.questionsHeaderText}>Research Questions</Text>
                <View style={styles.questionsHeaderButtons}>
                  <TouchableOpacity 
                    onPress={toggleFullscreenQuestions}
                    style={styles.questionsActionButton}
                  >
                    <MaterialIcons name="fullscreen" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={toggleQuestions}
                    style={styles.questionsCloseButton}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              <ResearchQuestions 
                researchId={research_id} 
                onQuestionsLoaded={handleQuestionsLoaded}
              />
            </View>
          )}
        </MotiView>
      )}

      {/* Fullscreen Questions Modal */}
      <Modal
        visible={showFullscreenQuestions}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFullscreenQuestions(false)}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>Research Questions</Text>
            <TouchableOpacity 
              onPress={() => setShowFullscreenQuestions(false)}
              style={styles.fullscreenCloseButton}
            >
              <AntDesign name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.fullscreenContent}>
            {isQuestionsLoading ? (
              <View style={styles.questionsLoadingContainer}>
                <ActivityIndicator size="large" color="#6c63ff" />
                <Text style={styles.questionsLoadingText}>
                  {loadingQuestionsMessage}
                </Text>
              </View>
            ) : (
              <ResearchQuestions 
                researchId={research_id} 
                onQuestionsLoaded={handleQuestionsLoaded}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  contentContainer: {
    flex: 1
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundElement: {
    position: 'absolute',
    borderRadius: 30,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },  inputContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    marginBottom: 6, // Add bottom margin to lift the input box
    position: 'relative',
    zIndex: 10 // Ensure input appears above other elements
  },
  floatingInputContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)', // Increased opacity for better visibility
    borderRadius: 16,
    padding: 6, // Slightly increased padding
    borderWidth: 1.5, // Thicker border for more visibility
    borderColor: 'rgba(108, 99, 255, 0.4)', // More visible border
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, // Increased shadow opacity
    shadowRadius: 16,
    elevation: 8, // Increased elevation on Android
    marginBottom: 8, // Additional bottom margin
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  queryInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    paddingVertical: 10,
    maxHeight: 120,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 16,
    fontWeight: '500'
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
    shadowRadius: 8
  },
  backButton: {
    padding: 6
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerLogoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8
  },
  rightPlaceholder: {
    width: 36
  },
  agentInfoContainer: {
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
    elevation: 4
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
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  agentDetails: {
    flex: 1
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8
  },
  agentDescription: {
    fontSize: 14,
    color: '#9eeafc',
    fontStyle: 'italic'
  },
  parametersSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.2)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  parametersContent: {
    padding: 16
  },
  parametersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8
  },
  keyboardAvoidView: {
    flex: 1
  },
  floatingInputWrapper: {
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  sliderContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  valueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 36,
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  valueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 212, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  sliderTrackContainer: {
    position: 'relative',
    height: 60,
    justifyContent: 'center'
  },
  sliderTrackGradient: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  sliderTrack: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.2)'
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8
  },
  fillGradient: {
    flex: 1,
    borderRadius: 3
  },
  stopsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0
  },
  stop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  stopText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  toggleOuter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 3,
    justifyContent: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(30, 41, 59, 0.9)'
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4
  },
  toggleIcon: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6c63ff'
  },
  toggleStateText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#9eeafc',
    fontWeight: '600',
    width: 40,
    textShadowColor: 'rgba(158, 234, 252, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  dropdownContainer: {
    marginBottom: 16,
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  dropdownTrigger: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(158, 234, 252, 0.3)',
    backgroundColor: 'rgba(30, 41, 59, 0.8)'
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff'
  },
  dropdownIcon: {
    marginLeft: 8,
    color: '#9eeafc'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.2)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  closeButton: {
    padding: 8
  },
  optionsContainer: {
    maxHeight: 300
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.1)'
  },
  optionText: {
    fontSize: 16,
    color: '#ffffff'
  },
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  aiMessageContainer: {
    justifyContent: 'flex-start'
  },
  userMessageContainer: {
    justifyContent: 'flex-end'
  },
  systemMessageContainer: {
    justifyContent: 'center'
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  systemAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    marginRight: 8
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18
  },
  aiMessageBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#6c63ff'
  },
  userMessageBubble: {
    backgroundColor: '#6c63ff'
  },
  systemMessageBubble: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'center',
    maxWidth: '90%'
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22
  },
  systemMessageText: {
    color: '#6c63ff',
    fontSize: 14,
    textAlign: 'center'
  },
  timestampText: {
    fontSize: 10,
    color: '#aaa',
    alignSelf: 'flex-end',
    marginTop: 4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
  },
  loadingSubText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  keyboardAvoidView: {
    flex: 1
  },
  contentContainer: {
    flex: 1,
    position: 'relative'
  },  // Background glow effects for futuristic appearance
  bgGlow1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4A00E0',
    top: -100,
    left: -150,
    opacity: 0.15,
    zIndex: -2
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
    zIndex: -2
  },
  queryInputContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    width: '92%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)'
  },
  queryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  queryInputRowWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(158, 234, 252, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  queryInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(158, 234, 252, 0.2)',
    marginRight: 8,
    textShadowColor: 'rgba(158, 234, 252, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 8,
    textShadowColor: 'rgba(255, 107, 107, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'flex-end',
    marginLeft: 8,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(158, 234, 252, 0.4)'
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  agentIconGradient: {
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
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  agentTextContainer: {
    flex: 1
  },
  researchProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  researchingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 16
  },
  progressBarContainer: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6c63ff',
    borderRadius: 10
  },
  progressText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600'
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  confirmationCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10
  },
  confirmationIcon: {
    marginBottom: 16
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8
  },
  confirmationQuery: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600'
  },
  confirmationParams: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 8
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center'
  },
  questionsContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 12,
    margin: 10,
    overflow: 'hidden'
  },
  questionsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.2)',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
  },
  questionsHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  questionsCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  questionsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  questionsLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9eeafc',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
    fontWeight: '500'
  },
  questionsHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionsActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    marginRight: 8,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.3)',
  },
  fullscreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullscreenCloseButton: {
    padding: 8,
  },
  fullscreenContent: {
    flex: 1,
    padding: 16,
  },
  answerQuestionsButton: {
    marginTop: 20,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  answerQuestionsGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  answerQuestionsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerQuestionsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  viewProgressButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  viewProgressGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  viewProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
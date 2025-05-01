import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Dimensions,
  ActivityIndicator,
  Animated,
  TextInput,
  Modal,
  Platform,
  useColorScheme,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner-native';
import ResearchProgressMonitor from '../components/ResearchProgressMonitor';
import TopicCard from '../components/TopicCard';
import { cleanupDebugTopics } from '../utils/researchService';
import { BlurView } from 'expo-blur';

// Define types for route params
type RouteParams = {
  research_id: string;
  query?: string;
  breadth?: number;
  depth?: number;
};

// Define research progress item type
type ResearchProgressItem = {
  progress_id: string;
  research_id: string;
  user_id: string;
  topic: string;
  created_at: string;
  links: Array<{
    url: string;
    title: string;
  }>;
  state?: 'researching' | 'done'; // Add optional state property
};

const { width } = Dimensions.get('window');

// Update color palette with darker blue
const COLORS = {
  midnightNavy: '#030812',  // Darker background color
  deepNavy: '#091429',
  charcoalSmoke: 'rgba(45, 52, 57, 0.55)',
  accentBlue: '#4C87EA',
  accentTeal: '#30A9C1',
  progressGradientStart: '#4C87EA',
  progressGradientEnd: '#30A9C1',
  errorRed: '#FF5252',
  textPrimary: '#F0F2F5',
  textSecondary: 'rgba(224, 224, 224, 0.7)',
  textMuted: 'rgba(224, 224, 224, 0.45)',
  glacialTeal: 'rgba(100, 255, 218, 0.7)', // Interactive elements
  accentBlueGlow: 'rgba(59, 130, 246, 0.3)', // Button glow
  burnishedGold: '#FFC107',     // Highlights
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)', // Subtle alerts
  paleMoonlight: '#E0E0E0',     // Text and icons
  translucent: 'rgba(15, 23, 42, 0.6)'  // More transparent card color
};

// Updated progress colors with gradients
const PROGRESS_COLORS = {
  low: ['#3B82F6', '#2563EB'] as const,
  medium: ['#8B5CF6', '#7C3AED'] as const,
  high: ['#EC4899', '#D946EF'] as const,
  done: ['#10B981', '#059669'] as const
};

// Enhance the GlassMorphicBlur component for a stronger glass effect
const GlassMorphicBlur = ({ 
  children, 
  intensity = 15, // Increased default intensity
  style,
  fullyTransparent = false
}: { 
  children: React.ReactNode; 
  intensity?: number; 
  style?: any;
  fullyTransparent?: boolean;
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={fullyTransparent ? 0 : intensity} // Use potentially higher intensity
        tint="dark"
        style={[{ overflow: 'hidden', borderRadius: 16 }, style]}
      >
        <View style={{ 
          backgroundColor: fullyTransparent ? 'transparent' : COLORS.charcoalSmoke, // Use updated color
          // Reduced opacity for a clearer glass look, but ensure readability
          opacity: fullyTransparent ? 0 : 0.6, 
          ...StyleSheet.absoluteFillObject 
        }} />
        {children}
      </BlurView>
    );
  }

  // Fallback for Android - use the adjusted translucent color
  return (
    <View style={[{ overflow: 'hidden', borderRadius: 16 }, style]}>
      <View style={{ 
        backgroundColor: fullyTransparent ? 'transparent' : COLORS.translucent, // Use updated color
        opacity: fullyTransparent ? 0 : 0.85, // Keep Android slightly more opaque
        ...StyleSheet.absoluteFillObject 
      }} />
      {children}
    </View>
  );
};

// Create a more dynamic animated pulsing dots component
const PulsingDots = () => {
  // Define the transition config type explicitly to help TypeScript - REMOVED
  /*
  const transitionConfig: MotiTransitionProp = {
    type: 'timing',
    duration: 300,
    loop: true,
    repeatReverse: true, // Make it pulse back down
  };
  */

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 5 }}>
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ scale: 0.5, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 0.8 }}
          // Use type assertion as a workaround for persistent linter error
          transition={{
            type: 'timing',
            duration: 300,
            delay: i * 150,
            loop: true,
            repeatReverse: true,
          } as any} // Type assertion added
          style={{ 
            width: 5, 
            height: 5, 
            borderRadius: 2.5, 
            backgroundColor: '#fff', 
            marginHorizontal: 2 
          }}
        />
      ))}
    </View>
  );
};

// Helper function to get favicon URL
const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    // Using Google's favicon service as a simple approach
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    console.warn("Could not parse URL for favicon:", url, e);
    // Return a default or placeholder icon URL if needed
    return 'https://via.placeholder.com/16'; // Example placeholder
  }
};

const ResearchProgressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const progressAnimValue = useRef(new Animated.Value(0)).current;
  
  // Get research ID from route params
  const { research_id, query, breadth = 3, depth = 3 } = route.params || {};
  
  // State variables
  const [topics, setTopics] = useState<ResearchProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expectedTopics, setExpectedTopics] = useState(5); // Default fallback
  const [isComplete, setIsComplete] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [totalTopics, setTotalTopics] = useState<number>(0);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [resultsAvailable, setResultsAvailable] = useState(false);
  
  // Calculate estimated total topics based on breadth and depth
  useEffect(() => {
    // Calculate as per the formula: (Depth × Breadth) + 3
    // +3 accounts for: 1) firing the research topic, 2) preparing the final draft, 3) ready state
    const totalSerpQueries = breadth * depth;
    const totalTopics = totalSerpQueries + 3;
    
    // Ensure we have at least 4 topics (1 query + 3 additional states)
    const estimate = Math.max(4, totalTopics);
    
    console.log(`Estimated topics: ${estimate} (${breadth} breadth × ${depth} depth + 3 additional steps)`);
    setExpectedTopics(estimate);
  }, [breadth, depth]);
  
  // Animate progress when it changes
  const progress = calculateProgress();
  useEffect(() => {
    Animated.timing(progressAnimValue, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
    
    // Check if research is complete
    if (progress >= 99 || isResearchDone()) {
      setIsComplete(true);
    }
  }, [progress]);
  
  // Set up Supabase subscription
  useEffect(() => {
    if (!research_id) {
      setError('No research ID provided');
      setIsLoading(false);
      return;
    }
    
    // Load data in background without setting loading state
    // to prevent full visual refresh
    fetchInitialTopics(false);
    
    // Set up real-time subscription
    const channel = supabase
      .channel('research-progress-' + research_id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_progress_new',
          filter: `research_id=eq.${research_id}`
        },
        handleProgressUpdate
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to research progress updates for:', research_id);
        }
      });
    
    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [research_id]);
  
  // Set up a periodic cleanup to handle any new debug topics that might get added
  useEffect(() => {
    if (!research_id) return;
    
    console.log('Setting up periodic debug topics cleanup');
    
    // Run a cleanup every 30 seconds
    const intervalId = setInterval(() => {
      console.log('Running periodic debug topics cleanup');
      cleanupDebugTopics(research_id)
        .then(cleaned => {
          if (cleaned) {
            // Only refresh if topics were actually cleaned up
            fetchInitialTopics();
          }
        })
        .catch(err => {
          console.error('Error during periodic debug topics cleanup:', err);
        });
    }, 30000);
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [research_id]);
  
  // Fetch initial topics data
  const fetchInitialTopics = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      const { data, error } = await supabase
        .from('research_progress_new')
        .select('*')
        .eq('research_id', research_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Transform data to ensure links is an array
      const transformedData = data.map(item => ({
        ...item,
        links: Array.isArray(item.links) ? item.links : []
      }));
      
      // Filter out debug topics
      const filteredData = transformedData.filter(item => 
        !item.topic || 
        (typeof item.topic === 'string' && !item.topic.includes('Debug Topic'))
      );
      
      console.log(`Filtered out ${transformedData.length - filteredData.length} debug topics`);
      
      setTopics(filteredData);
      
      // Check if research is done from the latest topic
      if (filteredData.length > 0 && filteredData[0].topic.toLowerCase().includes('research_done')) {
        setIsComplete(true);
      }
    } catch (err) {
      console.error('Error fetching topics:', err);
      setError('Failed to load research progress data');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        // Only update loading state after a delay to prevent UI flashing
        setTimeout(() => setIsLoading(false), 300);
      }
    }
  };
  
  // Handle real-time updates without refreshing entire screen
  const handleProgressUpdate = (payload: any) => {
    console.log('Received progress update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Filter out debug topics
    if (newRecord && 
        newRecord.topic && 
        typeof newRecord.topic === 'string' && 
        newRecord.topic.includes('Debug Topic')) {
      console.log('Ignoring debug topic:', newRecord.topic);
      return;
    }
    
    if (eventType === 'INSERT') {
      // Add new topic to the top of the list without triggering loading state
      setTopics(currentTopics => {
        // Check if this topic already exists
        const exists = currentTopics.some(topic => topic.progress_id === newRecord.progress_id);
        if (exists) return currentTopics;
        
        // Mark previous topics as "done" by adding a "done" flag
        // Ensure the currently active topic (index 0) gets marked done visually
        const updatedTopics = currentTopics.map((topic, index) => {
          // Mark the *previous* active topic as done when a new one arrives
          if (index === 0 && topic.state !== 'done' && !topic.topic.toLowerCase().includes('ready')) {
            console.log(`Marking topic ${topic.progress_id} as done`);
            return { ...topic, state: 'done' };
          }
          return topic;
        });
        
        const newItem = {
          ...newRecord,
          links: Array.isArray(newRecord.links) ? newRecord.links : [],
          state: 'researching'
        };
        
        return [newItem, ...updatedTopics];
      });
      
      // Scroll to top when new topic is added
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 300);
      
      // Show toast notification
      toast.success('New research topic added');
      
      // Check if this new topic indicates research is done or ready
      if (newRecord.topic.toLowerCase().includes('research_done') || 
          newRecord.topic.toLowerCase().includes('ready')) {
        setIsComplete(true);
        toast.success('Research has completed!');
      }
    } else if (eventType === 'UPDATE') {
      // Update existing topic with new data
      setTopics(currentTopics => 
        currentTopics.map(topic => {
          if (topic.progress_id === newRecord.progress_id) {
            return {
              ...topic,
              ...newRecord,
              links: Array.isArray(newRecord.links) ? newRecord.links : [],
              state: topic.state // preserve the state
            };
          }
          return topic;
        })
      );
      
      // Show toast for link updates
      if (oldRecord && newRecord.links && 
          (!oldRecord.links || oldRecord.links.length < newRecord.links.length)) {
        toast.success('New source added to research');
      }
    } else if (eventType === 'DELETE') {
      // Remove deleted topic
      setTopics(currentTopics => 
        currentTopics.filter(topic => topic.progress_id !== oldRecord.progress_id)
      );
    }
  };
  
  // Calculate overall progress
  function calculateProgress() {
    if (topics.length === 0) return 0;
    
    // If the research is done, return 100%
    if (isResearchDone() || isComplete) return 100;
    
    // Calculate progress based on topics completed
    const topicsWithoutFinal = topics.length;
    const expectedWithoutFinal = expectedTopics;
    
    // Calculate percentage with a cap at 99% until fully done
    const percentage = Math.min(Math.round((topicsWithoutFinal / expectedWithoutFinal) * 100), 99);
    
    return percentage;
  }
  
  // Check if research is done by looking at the latest topic
  function isResearchDone() {
    return topics.length > 0 && topics[0].topic.toLowerCase().includes('research_done');
  }
  
  // Get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (isComplete) return PROGRESS_COLORS.done;
    if (percentage < 30) return PROGRESS_COLORS.low;
    if (percentage < 70) return PROGRESS_COLORS.medium;
    return PROGRESS_COLORS.high;
  };
  
  // Render source links for a topic - Redesigned
  const renderSourceLinks = (links: ResearchProgressItem['links']) => {
    if (!links || links.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.sourcesSection}>
        <View style={styles.sourcesHeader}>
          <Feather name="link" size={14} color="rgba(224, 224, 224, 0.6)" />
          <Text style={styles.sourcesTitle}>Sources ({links.length})</Text>
        </View>
        <View style={styles.sourcesContainerMinimal}>
          {links.map((link, linkIndex) => (
            <TouchableOpacity 
              key={linkIndex}
              style={[
                styles.sourceLinkMinimal,
                // Remove border bottom for the last item
                linkIndex === links.length - 1 && { borderBottomWidth: 0 } 
              ]}
              onPress={() => Linking.openURL(link.url)}
            >
              <Image 
                source={{ uri: getFaviconUrl(link.url) }} 
                style={styles.favicon} 
                // Add a default source or error handling if needed
                onError={(e) => console.log("Failed to load favicon:", e.nativeEvent.error)}
              />
              <Text style={styles.sourceLinkTextMinimal} numberOfLines={1}>
                {link.title || new URL(link.url).hostname} 
              </Text>
              {/* Keep external link icon subtle */}
              <Feather name="external-link" size={12} color={COLORS.textMuted} style={{ marginLeft: 'auto' }}/>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  // Check if results are ready
  const isResearchComplete = () => {
    return isComplete || calculateProgress() >= 99;
  };
  
  // Monitor for research results
  useEffect(() => {
    if (!research_id) return;

    console.log(`Setting up real-time monitoring for research results: ${research_id}`);

    // Set up subscription for research results
    const subscription = supabase
      .channel(`progress-results-${research_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'research_results_new',
        filter: `research_id=eq.${research_id}`
      }, (payload) => {
        console.log('Research result update received:', payload);
        
        // Mark results as available
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          console.log('Setting resultsAvailable to true');
          setResultsAvailable(true);
          
          // Also mark research as complete if not already
          if (!isComplete) {
            setIsComplete(true);
          }
        }
      })
      .subscribe();

    // Check if results already exist
    const checkExistingResults = async () => {
      try {
        const { data, error } = await supabase
          .from('research_results_new')
          .select('result_id')
          .eq('research_id', research_id)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log('Existing results found:', data);
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
  }, [research_id, isComplete]);
  
  // Navigate to results screen
  const viewResults = () => {
    console.log(`Navigating to ResearchResultScreen with research_id: ${research_id}`);
    
    if (!resultsAvailable) {
      console.log('Results not fully available yet, but will navigate and show loading state');
      toast.info('Your research report is still being prepared');
    }
    
    // Pass the research_id both as research_id and researchId to ensure compatibility
    navigation.navigate('ResearchResultScreen', { 
      researchId: research_id,
      research_id: research_id  // Redundant but ensures backward compatibility
    });
  };
  
  const progressWidth = progressAnimValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  // Get user ID from first topic or use default
  useEffect(() => {
    if (topics.length > 0 && topics[0].user_id) {
      setUserId(topics[0].user_id);
    } else {
      // Set a default user ID if none is found
      setUserId('system-user');
    }
  }, [topics]);

  // Update progress percentage when topics change
  useEffect(() => {
    // Calculate current progress
    const currentProgress = calculateProgress();
    setProgressPercentage(currentProgress);
    
    // Check if research is complete
    if (currentProgress >= 99 || isResearchDone()) {
      setIsComplete(true);
    }
    
    // Update total topics count
    setTotalTopics(topics.length);
    
    console.log(`Progress updated: ${currentProgress}%, Topics: ${topics.length}/${expectedTopics}`);
  }, [topics, expectedTopics]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient with darker blues */}
      <LinearGradient
        colors={[COLORS.midnightNavy, '#030812']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Include the research progress monitor */}
      {research_id && userId && (
        <ResearchProgressMonitor 
          researchId={research_id}
          userId={userId}
          onComplete={() => {
            // Refresh data when research is completed
            fetchInitialTopics();
            setIsComplete(true);
          }}
        />
      )}
      
      {/* Simplified Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.7)', 'rgba(45, 52, 57, 0.5)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.placeholder} />
      </View>
      
      {/* Progress Summary with Enhanced Translucent Card */}
      <GlassMorphicBlur intensity={15} style={[styles.progressSummary, { borderWidth: 0 }]} fullyTransparent={true}>
        <View style={styles.queryContainer}>
          <Text style={styles.queryLabel}>Research Query</Text>
          <Text style={styles.queryText}>{query || 'Research in progress'}</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressLabelContainer}>
            <Text style={styles.progressText}>
              Progress: {isComplete ? '100' : Math.min(progress, 99)}%
            </Text>
          </View>
          
          <View style={styles.progressBarOuter}>
            <Animated.View
              style={[
                styles.progressBarInner,
                { width: progressWidth }
              ]}
            >
              <LinearGradient
                colors={getProgressColor(progress)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
        </View>
      </GlassMorphicBlur>
      
      {/* Topics List with Translucent Cards */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <GlassMorphicBlur intensity={15} style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.accentBlue} />
            <Text style={styles.loadingText}>Loading research progress...</Text>
          </GlassMorphicBlur>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <GlassMorphicBlur intensity={15} style={styles.stateCard}>
            <MaterialIcons name="error-outline" size={48} color={COLORS.deepCoralGlow} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => fetchInitialTopics(true)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </GlassMorphicBlur>
        </View>
      ) : topics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <GlassMorphicBlur intensity={15} style={styles.stateCard}>
            <MaterialIcons name="hourglass-empty" size={48} color={COLORS.accentBlue} />
            <Text style={styles.emptyText}>
              Waiting for research to begin...
            </Text>
          </GlassMorphicBlur>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.topicsContainer}
          showsVerticalScrollIndicator={false}
        >
          {topics
            .filter(topic => !topic.topic.toLowerCase().includes('research_done'))
            .map((topic, index) => {
              // Calculate the correct number - adding 1 to fix the numbering issue
              const topicNumber = topics.filter(t => !t.topic.toLowerCase().includes('research_done')).length - index;
              
              return (
                <MotiView
                  key={topic.progress_id}
                  from={{ opacity: 0, translateY: 20, scale: 0.95 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  // Use type assertion as a workaround for persistent linter error
                  transition={{
                     type: 'timing',
                     duration: 500,
                     delay: index * 100
                  } as any} // Type assertion added
                  style={styles.topicCardContainer}
                >
                  {/* Use higher intensity for topic cards */}
                  <GlassMorphicBlur intensity={20} style={[ 
                    styles.topicCard,
                    // Apply active style only if it's the first, not complete, and not explicitly 'done'
                    index === 0 && !isComplete && topic.state !== 'done' && styles.activeTopicCard, 
                    // Apply done style if explicitly 'done' or includes 'ready'
                    (topic.state === 'done' || topic.topic.toLowerCase().includes('ready')) && styles.doneTopicCard
                  ]}>
                    <View style={styles.topicHeader}>
                      <View style={styles.topicNumberContainer}>
                        <Text style={styles.topicNumber}>{topicNumber}</Text>
                      </View>
                      <Text style={[
                        styles.topicTitle,
                        (topic.topic.toLowerCase().includes('ready') || topic.state === 'done') && styles.doneTopicTitle
                      ]}>
                        {topic.topic}
                      </Text>
                    </View>
                    
                    {/* Status badge for active research - use new PulsingDots */}
                    {(index === 0 && !topic.topic.toLowerCase().includes('ready') && !isComplete && topic.state !== 'done') && (
                      <MotiView
                        style={styles.statusBadgeActive}
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <MaterialIcons name="hourglass-top" size={12} color="#fff" style={{ marginRight: 4 }}/>
                        <Text style={styles.statusTextActive}>Researching</Text>
                        <PulsingDots /> 
                      </MotiView>
                    )}
                    
                    {/* Status badge for completed topics */}
                    {/* Ensure 'Done' shows if state is 'done' OR topic includes 'ready' */}
                    {(topic.state === 'done' || topic.topic.toLowerCase().includes('ready')) && ( 
                      <MotiView
                        style={styles.statusBadgeDone}
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <MaterialIcons name="check-circle" size={12} color="#fff" />
                        <Text style={styles.statusTextDone}>Done</Text>
                      </MotiView>
                    )}
                    
                    {/* Use the redesigned renderSourceLinks */}
                    {renderSourceLinks(topic.links)}
                    
                    <Text style={styles.topicTime}>
                      {new Date(topic.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </GlassMorphicBlur>
                </MotiView>
              );
            })}
        </ScrollView>
      )}
      
      {/* Bottom Actions - Glass Effect */}
      <GlassMorphicBlur intensity={25} style={styles.actionsContainer}>
        {isResearchComplete() ? (
          <TouchableOpacity 
            style={styles.resultsButton}
            onPress={viewResults}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resultsButtonGradient}
            >
              {!resultsAvailable ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={styles.loadingIcon} />
                  <Text style={styles.resultsButtonText}>Results Processing...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="assignment-turned-in" size={20} color="#fff" />
                  <Text style={styles.resultsButtonText}>View Results</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.backToAppButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToAppText}>Continue in Background</Text>
          </TouchableOpacity>
        )}
      </GlassMorphicBlur>
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
    paddingVertical: 16,
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
  placeholder: {
    width: 40,
  },
  progressSummary: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassInner: {
    padding: 16,
    width: '100%',
    height: '100%',
  },
  queryContainer: {
    marginBottom: 16,
  },
  queryLabel: {
    fontSize: 12,
    color: 'rgba(224, 224, 224, 0.7)',
    marginBottom: 4,
  },
  queryText: {
    fontSize: 16,
    color: COLORS.paleMoonlight,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.paleMoonlight,
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0,
  },
  progressGradient: {
    height: '100%',
    width: '100%',
    borderWidth: 0, // Ensure no border
  },
  scrollView: {
    flex: 1,
  },
  topicsContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  topicCardContainer: {
    marginBottom: 16,
  },
  topicCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0, // Explicitly remove border
    // Adjusted background for glass effect consistency
    backgroundColor: 'transparent', 
  },
  activeTopicCard: {
     // Keep subtle highlight for active card, maybe slightly brighter background within blur
     // The GlassMorphicBlur component handles the main background styling
     // Add a subtle inner glow or slightly different tint if needed via GlassMorphicBlur style prop maybe
     // Example: Add a very subtle border highlight if desired
     // borderColor: 'rgba(139, 92, 246, 0.3)', 
     // borderWidth: 0.5, 
  },
  doneTopicCard: {
    // Similar to active, rely on GlassMorphicBlur, maybe adjust tint slightly for done state if needed
    // Example: Subtle border highlight
    // borderColor: 'rgba(16, 185, 129, 0.2)',
    // borderWidth: 0.5,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
  },
  topicNumberContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 0, // Remove border
  },
  topicNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentBlue,
    textAlign: 'center',
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.paleMoonlight, // Ensure text is readable on glass
    flex: 1,
  },
  doneTopicTitle: {
    // Adjust color for better visibility if needed, or keep as is if contrast is good
    color: COLORS.glacialTeal, // Use a teal color for 'done' title
    textDecorationLine: 'line-through', // Add line-through for clarity
    opacity: 0.8, // Slightly fade done titles
  },
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    // Removed marginLeft, spacing handled by PulsingDots margin
  },
  statusBadgeDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statusTextDone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  sourcesSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16, // Keep padding for the section
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(224, 224, 224, 0.7)',
  },
  sourcesContainerMinimal: {
    // Use a less prominent background, maybe slightly darker than the card's blur background
    backgroundColor: 'rgba(0, 0, 0, 0.15)', 
    borderRadius: 8,
    marginTop: 8,
    // No internal padding, let links handle it
  },
  sourceLinkMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Increase padding slightly
    paddingHorizontal: 12, // Add horizontal padding
    borderBottomWidth: 0.5, // Use a very subtle separator
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Lighter separator for dark theme
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 3, // Slightly rounded corners for favicon
    marginRight: 10, // Space between favicon and text
  },
  sourceLinkTextMinimal: {
    fontSize: 13,
    color: COLORS.paleMoonlight, // Ensure good contrast
    flexShrink: 1, // Allow text to shrink if needed
    marginRight: 8, // Space before the external link icon
    // Remove underline
  },
  topicTime: {
    fontSize: 12,
    color: 'rgba(224, 224, 224, 0.5)',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
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
    padding: 24,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.accentBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.paleMoonlight,
    textAlign: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.1)',
  },
  resultsButton: {
    borderRadius: 8,
    overflow: 'hidden',
    margin: 16,
  },
  resultsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  resultsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backToAppButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    margin: 16,
  },
  backToAppText: {
    color: COLORS.paleMoonlight,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingIcon: {
    marginRight: 8,
  },
});

export default ResearchProgressScreen; 
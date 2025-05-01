import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import { toast } from 'sonner-native';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { supabase } from '../utils/supabase';
import { 
  fetchActiveQueueWithCache, 
  clearResearchCache
} from '../utils/researchService';

// Define cosmic theme palette to match ResearchResultScreen
const COSMIC_THEME = {
  midnightNavy: '#0A1128',
  deeperNavy: '#050A18', // Even darker shade for background
  glacialTeal: 'rgba(100, 255, 218, 0.7)',
  burnishedGold: '#FFC107',
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)',
  charcoalSmoke: 'rgba(45, 52, 57, 0.65)',
  paleMoonlight: '#E0E0E0',
  cardBackground: 'rgba(45, 52, 57, 0.45)', // Translucent charcoal for cards
  cardGlow: 'rgba(100, 255, 218, 0.1)',     // Subtle teal glow
  accentGlow: 'rgba(255, 193, 7, 0.15)',    // Subtle gold glow
};

// Define TypeScript interfaces for our data
interface ResearchItem {
  research_id: string;
  user_id: string;
  agent: string;
  query: string;
  breadth: number;
  depth: number;
  include_technical_terms: boolean;
  output_format: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  has_results?: boolean;
}

interface ResearchResult {
  result_id: string;
  research_id: string;
  user_id: string;
  result: string;
  created_at: string;
}

// Research card item props
interface ResearchCardProps {
  item: ResearchItem;
  index: number;
  onViewDetails: (researchId: string) => void;
}

// Enhanced Researching Animation Component
const ResearchingAnimation = () => {
  // Create three pulse animations with different timing for a more dynamic effect
  const pulseValues = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current
  ];

  useEffect(() => {
    // Set up animations for each pulse
    const animations = pulseValues.map((value, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
            delay: index * 200, // Stagger the start time
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          })
        ])
      );
    });

    // Start all animations
    animations.forEach(anim => anim.start());

    return () => {
      // Clean up animations
      animations.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 3 }}>
      <MaterialIcons name="science" size={12} color={COSMIC_THEME.glacialTeal} style={{ marginRight: 5 }} />
      <Text style={{ color: COSMIC_THEME.paleMoonlight, fontSize: 12, fontWeight: '600' }}>
        Researching
      </Text>
      
      {/* Animated dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
        {pulseValues.map((pulseValue, index) => (
          <Animated.View 
            key={index}
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: COSMIC_THEME.glacialTeal,
              marginHorizontal: 2,
              opacity: pulseValue,
              transform: [
                { 
                  scale: pulseValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2]
                  }) 
                }
              ]
            }}
          />
        ))}
      </View>
    </View>
  );
};

// Function to get gradient colors based on agent type - updated with cosmic theme
const getAgentGradient = (agent: string): string[] => {
  if (agent.toLowerCase().includes('health') || agent.toLowerCase().includes('bio')) {
    return ['rgba(255, 111, 97, 0.8)', 'rgba(255, 65, 108, 0.7)']; // coral theme
  } else if (agent.toLowerCase().includes('business')) {
    return ['rgba(0, 114, 255, 0.8)', 'rgba(0, 198, 255, 0.7)']; // blue theme
  } else if (agent.toLowerCase().includes('financial') || agent.toLowerCase().includes('finance')) {
    return ['rgba(17, 153, 142, 0.8)', 'rgba(56, 239, 125, 0.7)']; // green theme
  } else {
    // Default cosmic theme with glacial teal
    return ['rgba(100, 255, 218, 0.8)', 'rgba(59, 130, 246, 0.7)']; 
  }
};

// Format relative time (e.g., "2 hours ago")
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

// Enhanced Research Card Component with cosmic theme
const ResearchCard = ({ item, index, onViewDetails }: ResearchCardProps) => {
  const gradientColors = getAgentGradient(item.agent);
  const createdTime = getRelativeTime(item.created_at);
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 120 } as any}
      delay={index * 100}
      style={styles.researchCard}
    >
      {/* Card Background */}
      <LinearGradient
        colors={[
          'rgba(10, 17, 40, 0.5)', 
          'rgba(10, 17, 40, 0.7)'
        ]}
        style={styles.cardGradient}
      >
        {/* Subtle glow effect at the edges */}
        <View style={styles.cardGlowOverlay} />
        
        <View style={styles.cardHeader}>
          <Text numberOfLines={2} style={styles.queryText}>{item.query}</Text>
          <View style={styles.statusBadge}>
            <ResearchingAnimation />
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.agentContainer}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.agentBadge}
            >
              <Text style={styles.agentText}>{item.agent}</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Feather name="clock" size={14} color={COSMIC_THEME.glacialTeal} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Started: </Text>
              {createdTime}
            </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Feather name="maximize" size={14} color={COSMIC_THEME.glacialTeal} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Breadth: </Text>
              {item.breadth}
            </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Feather name="layers" size={14} color={COSMIC_THEME.glacialTeal} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Depth: </Text>
              {item.depth}
            </Text>
              </View>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => onViewDetails(item.research_id)}
        >
          <LinearGradient
            colors={['rgba(100, 255, 218, 0.2)', 'rgba(100, 255, 218, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewButtonGradient}
        >
          <Text style={styles.viewButtonText}>View Progress</Text>
            <MaterialIcons name="arrow-forward" size={16} color={COSMIC_THEME.glacialTeal} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </MotiView>
  );
};

export default function QueueScreen() {
  const navigation = useNavigation<any>();
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
  const [researchResults, setResearchResults] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseSubscriptionRef = useRef<any>(null);
  const { theme, isDarkMode } = useTheme();
  const { userId } = useUser();
  
  // Set up Supabase real-time subscription
  useEffect(() => {
    if (!userId) {
      console.log('No user ID available yet, skipping subscription setup');
      return;
    }
    
    console.log('Setting up real-time subscription for research data');
    
    // Subscribe to research_history_new changes - add filter for current user
    const historyChannel = supabase
      .channel('realtime:research_history')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'research_history_new',
          filter: `user_id=eq.${userId}` // Add filter for current user
        },
        (payload: any) => {
          console.log('Research history change received:', payload);
          
          // Update cached data
          if (payload.new) {
            updateActiveQueueCache(userId, payload.new)
              .then(success => {
                if (success) {
                  console.log('Successfully updated cache with real-time data');
                }
              })
              .catch(error => {
                console.error('Error updating cache with real-time data:', error);
              });
          }
          
          setResearchItems(prevItems => {
            if (payload.eventType === 'INSERT') {
              // Ensure payload.new has the right shape before adding it
              if (payload.new && typeof payload.new.research_id === 'string') {
                if (payload.new.status === 'completed') return prevItems;
                return [payload.new as ResearchItem, ...prevItems];
              }
              return prevItems;
            }
            if (payload.eventType === 'UPDATE') {
              if (payload.new && typeof payload.new.research_id === 'string') {
                if (payload.new.status === 'completed') {
                  return prevItems.filter(item => item.research_id !== payload.new.research_id);
                }
                return prevItems.map(item => 
                  item.research_id === payload.new.research_id ? (payload.new as ResearchItem) : item
                );
              }
              return prevItems;
            }
            if (payload.eventType === 'DELETE') {
              if (payload.old && typeof payload.old.research_id === 'string') {
                return prevItems.filter(item => item.research_id !== payload.old.research_id);
              }
              return prevItems;
            }
            return prevItems;
          });
          
          setLastUpdate(new Date());
        }
      )
      .subscribe();
      
    // Subscribe to research_results_new changes  
    const resultsChannel = supabase
      .channel('realtime:research_results')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'research_results_new',
          filter: `user_id=eq.${userId}` // Add filter for current user
        },
        (payload) => {
          console.log('Research result change received:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new && payload.new.research_id) {
            // Update cached results
            updateResearchResultsCache(userId, payload.new.research_id)
              .then(success => {
                if (success) {
                  console.log('Successfully updated results cache with real-time data');
                }
              })
              .catch(error => {
                console.error('Error updating results cache with real-time data:', error);
              });
            
            setResearchResults(prev => ({
              ...prev,
              [payload.new.research_id]: true
            }));
          }
        }
      )
      .subscribe();
    
    // Store subscription refs for cleanup
    supabaseSubscriptionRef.current = [historyChannel, resultsChannel];
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    return () => {
      // Clean up subscriptions on unmount
      if (supabaseSubscriptionRef.current) {
        supabaseSubscriptionRef.current.forEach((subscription: any) => {
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe();
          }
        });
      }
      
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [userId]);
  
  // Load research items on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadResearchItems();
    }
  }, [userId]);
  
  // Refresh data when focus changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('QueueScreen focused, refreshing data in background');
      if (userId) {
        // Use background refresh to avoid loading indicators
        loadResearchItems({ forceRefresh: false, background: true });
      }
    });
    
    return unsubscribe;
  }, [navigation, userId]);
  
  const fetchResearchResults = async () => {
    if (!userId) return;
    
    try {
      setIsFetching(true);
      
      // Use the cached approach
      const resultsMap = await fetchResearchResultsWithCache(userId);
      setResearchResults(resultsMap || {});
    } catch (error) {
      console.error('Unexpected error fetching research results:', error);
    } finally {
      setIsFetching(false);
    }
  };
  
  const loadResearchItems = async (options = { forceRefresh: false, background: false }) => {
    if (!userId) return;
    
    try {
      if (!options.background) {
        setIsLoading(true);
      }
      
      // Use the new fetchActiveQueueWithCache function
      const items = await fetchActiveQueueWithCache(userId, options);
      setResearchItems(items || []);
      
      // Check each item to see if results exist
      if (items && items.length > 0) {
        // Create a map to check for results by research_id
        const resultsMap = {};
        
        // Query for results in a single batch to reduce API calls
        const researchIds = items.map(item => item.research_id);
        const { data: resultsData } = await supabase
          .from('research_results_new')
          .select('research_id')
          .in('research_id', researchIds);
          
        // Mark which research items have results
        if (resultsData && resultsData.length > 0) {
          resultsData.forEach(result => {
            resultsMap[result.research_id] = true;
          });
          
          // Update the items with has_results flag
          const updatedItems = items.map(item => ({
            ...item,
            has_results: !!resultsMap[item.research_id]
          }));
          
          setResearchItems(updatedItems);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading research items:', error);
      toast.error('Failed to load research items');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    // Clear cache and force refresh on pull-to-refresh
    clearResearchCache(userId || undefined)
      .then(() => loadResearchItems({ forceRefresh: true, background: false }))
      .catch(error => {
        console.error('Error during refresh:', error);
        setRefreshing(false);
      });
  };
  
  const handleViewDetails = (researchId: string) => {
    navigation.navigate('ResearchProgressScreen', { research_id: researchId });
  };
  
  // Enhanced empty state with cosmic theme
  const renderEmptyState = () => (
    <MotiView 
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 700 }}
      style={styles.emptyContainer}
    >
      <View style={styles.emptyIconContainer}>
      <MaterialCommunityIcons 
          name="clipboard-text-search-outline" 
        size={80} 
          color={COSMIC_THEME.glacialTeal}
      />
      </View>
      <Text style={styles.emptyTitle}>No Active Research</Text>
      <Text style={styles.emptyText}>
        Research tasks you start will appear here while they're in progress.
      </Text>
      
      <TouchableOpacity 
        style={styles.startResearchButton}
        onPress={() => navigation.navigate('NewResearchScreen')}
      >
        <LinearGradient
          colors={['rgba(100, 255, 218, 0.8)', 'rgba(59, 130, 246, 0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startButtonGradient}
        >
          <Text style={styles.startButtonText}>Start New Research</Text>
          <MaterialIcons name="arrow-forward" size={18} color={COSMIC_THEME.midnightNavy} />
        </LinearGradient>
      </TouchableOpacity>
    </MotiView>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[COSMIC_THEME.deeperNavy, COSMIC_THEME.midnightNavy]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.7)', 'rgba(45, 52, 57, 0.5)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Research Queue</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COSMIC_THEME.glacialTeal]}
            tintColor={COSMIC_THEME.glacialTeal}
          />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 600 }}
              style={styles.loadingWrapper}
            >
              <Animated.View style={styles.loadingIconContainer}>
                <ActivityIndicator size="large" color={COSMIC_THEME.glacialTeal} />
              </Animated.View>
            <Text style={styles.loadingText}>Loading research items...</Text>
            </MotiView>
          </View>
        ) : researchItems.length > 0 ? (
          researchItems.map((item, index) => (
            <ResearchCard 
              key={item.research_id} 
              item={item} 
              index={index}
              onViewDetails={handleViewDetails}
            />
          ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COSMIC_THEME.deeperNavy, // Darker shade of blue
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 255, 218, 0.1)', // Subtle teal border
  },
  backButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 12,
  },
  backButtonGradient: {
    padding: 8,
    borderRadius: 30, 
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    color: COSMIC_THEME.paleMoonlight,
  },
  headerRight: {
    width: 40, // Helps keep the title centered
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Add extra bottom padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIconContainer: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 17, 40, 0.6)',
    marginBottom: 16,
    shadowColor: COSMIC_THEME.glacialTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    color: COSMIC_THEME.paleMoonlight,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    marginBottom: 20,
    shadowColor: COSMIC_THEME.glacialTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(224, 224, 224, 0.7)',
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: '80%',
  },
  startResearchButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: COSMIC_THEME.glacialTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    width: '80%',
    maxWidth: 300,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonText: {
    color: COSMIC_THEME.midnightNavy,
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
  },
  researchCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COSMIC_THEME.glacialTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
    borderRadius: 16,
  },
  cardGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(100, 255, 218, 0.4)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  queryText: {
    fontSize: 18,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 17, 40, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
  },
  cardContent: {
    marginBottom: 16,
  },
  agentContainer: {
    marginBottom: 12,
  },
  agentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  agentText: {
    color: COSMIC_THEME.paleMoonlight,
    fontSize: 12,
    fontWeight: '700',
  },
  cardInfo: {
    backgroundColor: 'rgba(10, 17, 40, 0.4)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 14,
    color: COSMIC_THEME.paleMoonlight,
  },
  infoLabel: {
    fontWeight: '600',
    color: 'rgba(224, 224, 224, 0.9)',
  },
  viewButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
  },
  viewButtonText: {
    color: COSMIC_THEME.glacialTeal,
    fontWeight: '600',
    fontSize: 14,
  },
});
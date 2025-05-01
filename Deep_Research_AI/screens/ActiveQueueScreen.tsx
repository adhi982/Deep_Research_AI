import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../context/supabase';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for research item from the database
interface ResearchItem {
  research_id: string;
  user_id: string;
  agent: string;
  query: string;
  breadth: number;
  depth: number;
  status: string;
  created_at: string;
  completed_at?: string;
  output_format: string;
}

const ActiveQueueScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { userId: globalUserId } = useUser();
  const [activeResearches, setActiveResearches] = useState<ResearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const supabaseSubscriptionRef = useRef<any>(null);
  const [userIdForQuery, setUserIdForQuery] = useState<string | null>(null);
  
  // Animation for the "Researching" indicator
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Setup pulse animation
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    
    animate();
    
    return () => {
      pulseAnimation.stopAnimation();
    };
  }, []);
  
  // Setup user ID from UserContext or AsyncStorage
  useEffect(() => {
    const setupUserId = async () => {
      try {
        // First try to use the global userId from UserContext
        if (globalUserId) {
          logDebug('INFO', 'setupUserId', `Using global userId from UserContext: ${globalUserId}`);
          setUserIdForQuery(globalUserId);
          return;
        }
        
        // If not available, try to get from AsyncStorage
        const storedUserId = await AsyncStorage.getItem('user_id');
        if (storedUserId) {
          logDebug('INFO', 'setupUserId', `Using stored userId from AsyncStorage: ${storedUserId}`);
          setUserIdForQuery(storedUserId);
          return;
        }
        
        logDebug('WARN', 'setupUserId', 'No user ID found. Will show all researches.');
      } catch (error) {
        logDebug('ERROR', 'setupUserId', 'Error getting user ID', error);
      }
    };
    
    setupUserId();
  }, [globalUserId]);
  
  // Helper function to check if a research item is pending
  const isPending = (status: string | null | undefined): boolean => {
    logDebug('INFO', 'isPending', `Checking if status '${status}' is pending`);
    
    if (status === null || status === undefined) {
      logDebug('INFO', 'isPending', 'Status is null/undefined, returning false');
      return false;
    }
    
    const result = status.toLowerCase() === 'pending';
    logDebug('INFO', 'isPending', `Status '${status}' isPending: ${result}`);
    return result;
  };

  // Helper function to check if a research item is completed
  const isCompleted = (status: string | null | undefined): boolean => {
    if (status === null || status === undefined) return false;
    return status.toLowerCase() === 'completed';
  };
  
  // Function to log for debugging
  const logDebug = (level: 'INFO' | 'WARN' | 'ERROR', context: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}][${level}][${context}] ${message}`;
    
    switch (level) {
      case 'INFO':
        console.log(logMsg);
        break;
      case 'WARN':
        console.warn(logMsg);
        break;
      case 'ERROR':
        console.error(logMsg);
        break;
    }
    
    if (data) {
      console.log(`[${timestamp}][${level}][${context}] Data:`, data);
    }
  };
  
  // Fetch active researches and set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchActiveResearches();
    
    // Setup real-time subscription for the specific user if we have a userId
    logDebug('INFO', 'setupSubscription', `Setting up real-time subscription for research_history_new table${userIdForQuery ? ' filtered by user_id' : ''}`);
    
    const filters = {
      event: '*',
      schema: 'public',
      table: 'research_history_new',
    };
    
    // Add user_id filter if available
    if (userIdForQuery) {
      Object.assign(filters, {
        filter: `user_id=eq.${userIdForQuery}`,
      });
    }
    
    const channel = supabase
      .channel('active-researches')
      .on(
        'postgres_changes',
        filters,
        (payload) => {
          logDebug('INFO', 'realtimeSubscription', `Received event: ${payload.eventType}`, payload);
          
          // Handle insert event
          if (payload.eventType === 'INSERT') {
            const isPendingStatus = isPending(payload.new.status);
            logDebug('INFO', 'realtimeSubscription', `INSERT: Research ID ${payload.new.research_id} with status '${payload.new.status}', isPending: ${isPendingStatus}`);
            
            if (isPendingStatus) {
              logDebug('INFO', 'realtimeSubscription', 'Adding new pending research to list');
              setActiveResearches((prev) => [payload.new as ResearchItem, ...prev]);
              setLastUpdated(new Date());
            }
          }
          
          // Handle update event - research completed or status changed
          if (payload.eventType === 'UPDATE') {
            const wasPending = isPending(payload.old.status);
            const isNowPending = isPending(payload.new.status);

            logDebug('INFO', 'realtimeSubscription', `UPDATE: Research ID ${payload.new.research_id}, old status: '${payload.old.status}', new status: '${payload.new.status}'`);
            logDebug('INFO', 'realtimeSubscription', `UPDATE: wasPending: ${wasPending}, isNowPending: ${isNowPending}`);

            if (wasPending && !isNowPending) {
              // Research transitioned from pending to non-pending
              logDebug('INFO', 'realtimeSubscription', `Research ${payload.new.research_id} is no longer pending, removing from list`);
              setActiveResearches((prev) =>
                prev.filter((item) => item.research_id !== payload.new.research_id)
              );
              setLastUpdated(new Date());

              // Show toast notification if completed
              if (isCompleted(payload.new.status)) {
                logDebug('INFO', 'realtimeSubscription', `Research ${payload.new.research_id} is completed, showing notification`);
                showCompletionNotification(payload.new.query);
              }
            } else if (isNowPending) {
              // Research is still pending but updated
              logDebug('INFO', 'realtimeSubscription', `Research ${payload.new.research_id} updated but still pending, updating in list`);
              setActiveResearches((prev) =>
                prev.map((item) =>
                  item.research_id === payload.new.research_id ? (payload.new as ResearchItem) : item
                )
              );
              setLastUpdated(new Date());
            }
          }
        }
      )
      .subscribe((status) => {
        logDebug('INFO', 'setupSubscription', `Subscription status: ${status}`, { status });
      });
    
    // Store subscription ref for cleanup
    supabaseSubscriptionRef.current = channel;
    
    return () => {
      // Cleanup subscription
      logDebug('INFO', 'setupSubscription', 'Cleaning up real-time subscription');
      if (supabaseSubscriptionRef.current) {
        supabase.removeChannel(supabaseSubscriptionRef.current);
      }
    };
  }, [userIdForQuery]);
  
  // Function to fetch active researches
  const fetchActiveResearches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      logDebug('INFO', 'fetchActiveResearches', `Starting to fetch pending researches${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
      
      // First, try to get any research at all, to see if we can connect
      const { data: anyData, error: anyError } = await supabase
        .from('research_history_new')
        .select('count')
        .limit(1);
        
      if (anyError) {
        logDebug('ERROR', 'fetchActiveResearches', 'Could not connect to database', anyError);
        setError('Could not connect to database');
        return;
      }
      
      logDebug('INFO', 'fetchActiveResearches', 'Database connection successful');
      
      // Build query for researches
      let query = supabase
        .from('research_history_new')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Add user_id filter if available
      if (userIdForQuery) {
        query = query.eq('user_id', userIdForQuery);
      }
        
      const { data: allData, error: allError } = await query;
        
      if (allError) {
        logDebug('ERROR', 'fetchActiveResearches', 'Failed to fetch all research items', allError);
      } else {
        logDebug('INFO', 'fetchActiveResearches', `Fetched ${allData.length} total research items${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
        if (allData.length > 0) {
          logDebug('INFO', 'fetchActiveResearches', 'Sample research item:', allData[0]);
          
          // Log unique status values
          const statusValues = [...new Set(allData.map(item => item.status))];
          logDebug('INFO', 'fetchActiveResearches', 'Unique status values found:', statusValues);
          
          // Log count by status
          const statusCounts = statusValues.map(status => {
            const count = allData.filter(item => item.status === status).length;
            return { status, count };
          });
          logDebug('INFO', 'fetchActiveResearches', 'Counts by status:', statusCounts);
        }
      }
      
      // Query specifically for "pending" status researches
      logDebug('INFO', 'fetchActiveResearches', `Querying specifically for status="pending"${userIdForQuery ? ' and user_id=' + userIdForQuery : ''}`);
      
      // Build query for pending researches
      let pendingQuery = supabase
        .from('research_history_new')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      // Add user_id filter if available
      if (userIdForQuery) {
        pendingQuery = pendingQuery.eq('user_id', userIdForQuery);
      }
      
      const { data, error } = await pendingQuery;
      
      if (error) {
        logDebug('ERROR', 'fetchActiveResearches', 'Failed to fetch pending researches', error);
        setError('Failed to load pending researches');
        return;
      }
      
      logDebug('INFO', 'fetchActiveResearches', `Fetched ${data.length} items with status="pending"${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
      
      // Also try with status case insensitive query
      logDebug('INFO', 'fetchActiveResearches', `Trying case-insensitive query for status containing "pending"${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
      
      // Build case-insensitive query
      let pendingCaseInsensitiveQuery = supabase
        .from('research_history_new')
        .select('*')
        .ilike('status', '%pending%')
        .order('created_at', { ascending: false });
      
      // Add user_id filter if available
      if (userIdForQuery) {
        pendingCaseInsensitiveQuery = pendingCaseInsensitiveQuery.eq('user_id', userIdForQuery);
      }
      
      const { data: pendingCaseInsensitive, error: pendingCaseInsensitiveError } = await pendingCaseInsensitiveQuery;
      
      if (pendingCaseInsensitiveError) {
        logDebug('ERROR', 'fetchActiveResearches', 'Failed with case-insensitive query', pendingCaseInsensitiveError);
      } else {
        logDebug('INFO', 'fetchActiveResearches', `Found ${pendingCaseInsensitive.length} items with status containing 'pending' (case-insensitive)${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
      }
      
      // If no pending researches found with exact match, try alternative methods
      if (data.length === 0) {
        logDebug('WARN', 'fetchActiveResearches', 'No pending researches found with exact match. Checking alternatives.');
        
        // Try with the isPending function
        if (allData && allData.length > 0) {
          // Filter by both pending status and user ID if available
          const pendingByFunction = allData.filter(item => 
            isPending(item.status) && 
            (!userIdForQuery || item.user_id === userIdForQuery)
          );
          
          logDebug('INFO', 'fetchActiveResearches', `Found ${pendingByFunction.length} pending items using isPending() function${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
          
          // If we found some with our function, use those
          if (pendingByFunction.length > 0) {
            logDebug('INFO', 'fetchActiveResearches', 'Using items found with isPending() function');
            setActiveResearches(pendingByFunction as ResearchItem[]);
            setLastUpdated(new Date());
            return;
          }
          
          // If case insensitive query found results, use those
          if (pendingCaseInsensitive && pendingCaseInsensitive.length > 0) {
            logDebug('INFO', 'fetchActiveResearches', 'Using items found with case-insensitive query');
            setActiveResearches(pendingCaseInsensitive as ResearchItem[]);
            setLastUpdated(new Date());
            return;
          }
          
          // As a last resort, manually check for items without "completed" status
          const nonCompletedItems = allData.filter(item => {
            const status = (item.status || '').toLowerCase();
            const isNotCompleted = !status.includes('complet') && !status.includes('done') && !status.includes('finish');
            return isNotCompleted && (!userIdForQuery || item.user_id === userIdForQuery);
          });
          
          logDebug('INFO', 'fetchActiveResearches', `Found ${nonCompletedItems.length} non-completed items as fallback${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
          
          if (nonCompletedItems.length > 0) {
            logDebug('INFO', 'fetchActiveResearches', 'Using non-completed items as fallback');
            setActiveResearches(nonCompletedItems as ResearchItem[]);
            setLastUpdated(new Date());
            return;
          }
        }
      }
      
      // If we got here, use the original query results
      logDebug('INFO', 'fetchActiveResearches', `Setting ${data.length} pending researches from original query${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
      setActiveResearches(data as ResearchItem[]);
      setLastUpdated(new Date());
    } catch (err) {
      logDebug('ERROR', 'fetchActiveResearches', 'Unexpected error fetching active researches', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to truncate text for display
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Function to format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get agent icon based on agent type
  const getAgentIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'general':
        return <Ionicons name="search" size={24} color={theme.accent} />;
      case 'business':
        return <Ionicons name="briefcase" size={24} color={theme.accent} />;
      case 'health':
        return <Ionicons name="fitness" size={24} color={theme.accent} />;
      case 'financial':
        return <Ionicons name="cash" size={24} color={theme.accent} />;
      default:
        return <Ionicons name="help-circle" size={24} color={theme.accent} />;
    }
  };
  
  // Navigate to research progress screen
  const viewProgress = (research: ResearchItem) => {
    navigation.navigate('ResearchProgressScreen' as never, { research_id: research.research_id } as never);
  };
  
  // Function to show toast notification when research completes
  const showCompletionNotification = (query: string) => {
    toast.success('Research Complete', {
      description: `Research "${truncateText(query, 30)}" is ready to view`
    });
  };
  
  // Render a single research item
  const renderResearchItem = ({ item }: { item: ResearchItem }) => (
    <TouchableOpacity
      style={[styles.researchCard, { backgroundColor: theme.card }]}
      onPress={() => viewProgress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.agentIconContainer}>
          {getAgentIcon(item.agent)}
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.agentName, { color: theme.text }]}>
            {item.agent.charAt(0).toUpperCase() + item.agent.slice(1)} Agent
          </Text>
          <Text style={[styles.dateText, { color: theme.secondaryText }]}>
            Started: {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.queryText, { color: theme.text }]}>
        {truncateText(item.query, 100)}
      </Text>
      
      {/* Status display for debugging */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: theme.secondaryText }]}>
          Status:
        </Text>
        <Text style={[styles.statusValue, { color: theme.text }]}>
          {item.status || 'null'}
        </Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Animated.View 
          style={[
            styles.statusBadge, 
            { transform: [{ scale: pulseAnimation }] }
          ]}
        >
          <ActivityIndicator size="small" color="#fff" style={styles.statusIcon} />
          <Text style={styles.statusText}>Researching...</Text>
        </Animated.View>
        
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => viewProgress(item)}
        >
          <Text style={styles.viewButtonText}>View Progress</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="search-off" size={64} color={theme.secondaryText} />
      <Text style={[styles.emptyText, { color: theme.text }]}>
        No active researches found
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.secondaryText }]}>
        Start a new research or check back later
      </Text>
      
      {/* Debug button - only show in dev */}
      <TouchableOpacity 
        style={[styles.debugButton, { backgroundColor: theme.accent }]}
        onPress={async () => {
          setIsLoading(true);
          try {
            // Build query for non-completed research items
            let query = supabase
              .from('research_history_new')
              .select('*')
              .not('status', 'in', '("completed","done","finished")')
              .order('created_at', { ascending: false });
            
            // Add user_id filter if available
            if (userIdForQuery) {
              query = query.eq('user_id', userIdForQuery);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            if (data && data.length > 0) {
              console.log('Debug - All pending research items:', data);
              console.log('Status values found:', data.map(item => item.status));
              console.log('User IDs found:', [...new Set(data.map(item => item.user_id))]);
              
              // Only show pending items
              const pendingItems = data.filter(item => isPending(item.status));
              setActiveResearches(pendingItems as ResearchItem[]);
              toast.info(`Debug: Showing ${pendingItems.length} pending research items${userIdForQuery ? ' for user: ' + userIdForQuery : ''}`);
            } else {
              toast.error(`No pending research data found${userIdForQuery ? ' for this user' : ' in database'}`);
            }
          } catch (err) {
            console.error('Debug fetch error:', err);
            toast.error('Error fetching pending research data');
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <Text style={styles.debugButtonText}>Show Only Pending Research Items</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar === 'light' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Active Research Queue
          </Text>
          {userIdForQuery && (
            <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
              Showing only your research items
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            setIsLoading(true);
            toast.info(`Refreshing research queue${userIdForQuery ? ' for your account' : ''}`);
            fetchActiveResearches();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="refresh" size={24} color={theme.text} />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Last updated timestamp */}
      {!isLoading && !error && (
        <View style={styles.timestampContainer}>
          <Text style={[styles.timestampText, { color: theme.secondaryText }]}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      )}
      
      {/* Content */}
      {isLoading && activeResearches.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading active researches...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeResearches}
          renderItem={renderResearchItem}
          keyExtractor={item => item.research_id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={fetchActiveResearches}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  rightHeaderSpace: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  researchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  agentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  queryText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 5,
  },
  timestampContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  timestampText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  debugButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ActiveQueueScreen;
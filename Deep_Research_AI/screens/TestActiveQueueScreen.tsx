import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../context/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';

console.log('⭐⭐⭐ TestActiveQueueScreen module loaded ⭐⭐⭐');

// Interface for the research_active_queue table
interface ResearchQueueItem {
  research_id: string;
  user_id: string;
  status: 'pending' | 'completed';
  created_at: string;
  agent?: string | null;
  title?: string | null;
}

// Test Active Queue Screen Component
export default function TestActiveQueueScreen() {
  console.log('⭐⭐⭐ TestActiveQueueScreen rendered ⭐⭐⭐');
  
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [queueItems, setQueueItems] = useState<ResearchQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const subscription = useRef<any>(null);
  
  // Helper function to add to logs
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`[${timestamp}] ${message}`, ...prevLogs]);
    console.log(`[TestActiveQueueScreen] ${message}`);
  };

  // Start pulse animation
  useEffect(() => {
    const startPulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ]).start(() => {
        startPulseAnimation();
      });
    };

    startPulseAnimation();
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [pulseAnim]);

  // Initial fetch of queue data
  useEffect(() => {
    console.log('⭐⭐⭐ Initial data fetch useEffect running ⭐⭐⭐');
    const fetchActiveQueue = async () => {
      addLog('Fetching active research queue data...');
      try {
        // Fetch all entries regardless of user_id to ensure we see everything in test mode
        const { data, error } = await supabase
          .from('research_active_queue')
          .select('*')
          .eq('status', 'pending') // Only get pending items
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        const rowCount = data ? data.length : 0;
        addLog(`Fetched ${rowCount} queue items`);
        console.log('Queue items:', JSON.stringify(data, null, 2));
        
        setQueueItems(data || []);
        
        // Immediately try again if we got zero results to ensure we're not missing anything
        if (rowCount === 0) {
          addLog('No items found, will try direct SQL query...');
          const { data: rawData, error: rawError } = await supabase
            .rpc('debug_get_all_queue_items');
            
          if (rawError) {
            addLog(`Error with direct query: ${rawError.message}`);
          } else {
            addLog(`Direct query found ${rawData ? rawData.length : 0} items`);
            console.log('Raw data:', JSON.stringify(rawData, null, 2));
            
            if (rawData && rawData.length > 0) {
              setQueueItems(rawData);
            }
          }
        }
      } catch (err: any) {
        addLog(`Error fetching queue: ${err.message}`);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveQueue();
    
    // Also set up a timer to periodically refresh data just to be absolutely sure
    const refreshTimer = setInterval(() => {
      fetchLatestData(true); // true means force refresh
    }, 3000);
    
    return () => {
      clearInterval(refreshTimer);
    };
  }, []);
  
  // Helper function to fetch latest data
  const fetchLatestData = async (force = false) => {
    if (!force) {
      addLog('Fetching latest queue data...');
    }
    
    try {
      const { data, error } = await supabase
        .from('research_active_queue')
        .select('*')
        .eq('status', 'pending') // Only get pending items
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Check if data is different before updating state
      const currentIds = queueItems.map(item => item.research_id).sort().join(',');
      const newIds = (data || []).map(item => item.research_id).sort().join(',');
      
      if (force || currentIds !== newIds) {
        addLog(`Queue updated: ${data ? data.length : 0} items`);
        setQueueItems(data || []);
      } else if (!force) {
        addLog('No changes detected in queue data');
      }
    } catch (err: any) {
      addLog(`Error fetching queue: ${err.message}`);
    }
  };
  
  // Handle creating a test research item
  const createTestResearch = async () => {
    addLog('Creating test research entry...');
    try {
      // Generate a unique research ID
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 7);
      const research_id = `research-${timestamp}-${randomId}`;
      
      // First create entry in research_history_new
      addLog(`Inserting into research_history_new with ID: ${research_id}`);
      const { data: historyData, error: historyError } = await supabase
        .from('research_history_new')
        .insert([{
          research_id,
          user_id: 'test-user',
          query: `Test Research ${timestamp}`,
          agent: 'test-agent',
          created_at: new Date().toISOString()
        }])
        .select();
        
      if (historyError) {
        throw historyError;
      }
      
      addLog(`Successfully created history entry: ${JSON.stringify(historyData)}`);
      
      // Verify that our trigger created an entry in the active queue
      // Short delay to allow trigger to execute
      addLog('Waiting for trigger to create queue entry...');
      setTimeout(async () => {
        try {
          const { data: queueData, error: queueError } = await supabase
            .from('research_active_queue')
            .select('*')
            .eq('research_id', research_id)
            .single();
            
          if (queueError) {
            addLog(`Error checking queue entry: ${queueError.message}`);
            return;
          }
          
          if (queueData) {
            addLog(`Trigger success! Queue entry created: ${queueData.research_id}`);
          } else {
            addLog('No queue entry found - trigger may have failed');
            
            // Try direct insertion as fallback
            addLog('Attempting direct insertion into queue table...');
            const { error: directError } = await supabase
              .from('research_active_queue')
              .insert([{
                research_id,
                user_id: 'test-user',
                status: 'pending',
                created_at: new Date().toISOString(),
                agent: 'test-agent',
                title: `Test Research ${timestamp}`
              }]);
              
            if (directError) {
              addLog(`Direct insertion failed: ${directError.message}`);
            } else {
              addLog('Direct insertion succeeded');
              // Trigger a refresh
              await fetchLatestData();
            }
          }
        } catch (err: any) {
          addLog(`Error in trigger verification: ${err.message}`);
        }
      }, 1000);
      
    } catch (err: any) {
      addLog(`Error creating test research: ${err.message}`);
      setError(err.message);
    }
  };
  
  // Handle completing a research item
  const completeResearch = async (researchId: string) => {
    addLog(`Marking research as complete: ${researchId}`);
    try {
      const { error } = await supabase
        .from('research_history_new')
        .update({ status: 'completed' })
        .eq('research_id', researchId);
        
      if (error) {
        throw error;
      }
      
      addLog(`Research marked as complete: ${researchId}`);
    } catch (err: any) {
      addLog(`Error completing research: ${err.message}`);
      setError(err.message);
    }
  };
  
  // Navigate back to test menu
  const goBack = () => {
    navigation.goBack();
  };
  
  // Add a button to the header to manually fetch all pending research items
  const syncAllPendingResearch = async () => {
    addLog('Starting manual sync of all pending research...');
    setIsLoading(true);
    
    try {
      // First fetch all pending research from research_history_new
      addLog('Fetching all research from research_history_new...');
      const { data: historyData, error: historyError } = await supabase
        .from('research_history_new')
        .select('*')
        .is('status', null)
        .order('created_at', { ascending: false });
        
      if (historyError) {
        throw historyError;
      }
      
      addLog(`Found ${historyData ? historyData.length : 0} pending research items`);
      
      if (!historyData || historyData.length === 0) {
        addLog('No pending research found to sync');
        setIsLoading(false);
        return;
      }
      
      // For each research item, create a queue entry
      let successCount = 0;
      let errorCount = 0;
      
      addLog(`Processing ${historyData.length} items for queue insertion...`);
      
      for (const item of historyData) {
        try {
          // Check if already exists in queue
          const { data: existingData, error: existingError } = await supabase
            .from('research_active_queue')
            .select('research_id')
            .eq('research_id', item.research_id)
            .maybeSingle();
            
          if (existingError) {
            addLog(`Error checking for existing entry: ${existingError.message}`);
            errorCount++;
            continue;
          }
          
          if (existingData) {
            addLog(`Item ${item.research_id} already in queue, skipping`);
            continue;
          }
          
          // Insert into queue
          const { error: insertError } = await supabase
            .from('research_active_queue')
            .insert([{
              research_id: item.research_id,
              user_id: item.user_id || 'unknown',
              status: 'pending',
              created_at: item.created_at || new Date().toISOString(),
              agent: item.agent || 'unknown',
              title: item.query || 'Untitled Research'
            }]);
            
          if (insertError) {
            addLog(`Error inserting ${item.research_id}: ${insertError.message}`);
            errorCount++;
          } else {
            addLog(`Successfully added ${item.research_id} to queue`);
            successCount++;
          }
        } catch (err: any) {
          addLog(`Error processing item ${item.research_id}: ${err.message}`);
          errorCount++;
        }
      }
      
      addLog(`Sync complete: ${successCount} successes, ${errorCount} errors`);
      
      // Refresh the queue data
      fetchLatestData(true);
    } catch (err: any) {
      addLog(`Error syncing pending research: ${err.message}`);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a function for direct insertion to test if the triggering mechanism is working
  const insertDirectly = async () => {
    addLog('Testing direct insertion into research_active_queue table...');
    
    try {
      // Generate a unique research ID
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 7);
      const research_id = `direct-${timestamp}-${randomId}`;
      
      // Directly insert into the queue table
      const { error } = await supabase
        .from('research_active_queue')
        .insert([{
          research_id,
          user_id: 'test-user',
          status: 'pending',
          created_at: new Date().toISOString(),
          agent: 'direct-test',
          title: `Direct Insert Test ${timestamp}`
        }]);
        
      if (error) {
        throw error;
      }
      
      addLog(`Successfully inserted ${research_id} directly into queue`);
      
      // Force refresh
      fetchLatestData(true);
    } catch (err: any) {
      addLog(`Error with direct insertion: ${err.message}`);
      setError(err.message);
    }
  };
  
  // Render a queue item
  const renderQueueItem = ({ item }: { item: ResearchQueueItem }) => {
    const createdAt = new Date(item.created_at);
    const formattedDate = format(createdAt, 'MMM d, yyyy h:mm a');
    
    return (
      <Animated.View 
        style={[
          styles.cardContainer,
          { 
            backgroundColor: theme.card,
            transform: [{ scale: item.status === 'pending' ? pulseAnim : 1 }]
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {item.title || 'Untitled Research'}
          </Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.status === 'pending' ? '#10B981' : '#6B7280' }
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'pending' ? 'Active' : 'Completed'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={16} color={theme.secondaryText} />
            <Text style={[styles.infoText, { color: theme.secondaryText }]}>
              {formattedDate}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={16} color={theme.secondaryText} />
            <Text style={[styles.infoText, { color: theme.secondaryText }]}>
              {item.agent || 'Unknown Agent'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="fingerprint" size={16} color={theme.secondaryText} />
            <Text 
              style={[styles.idText, { color: theme.secondaryText }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {item.research_id}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          {item.status === 'pending' && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => completeResearch(item.research_id)}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Mark Complete</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => {
              navigation.navigate('ResearchResultScreen', { 
                researchId: item.research_id,
                research_id: item.research_id 
              });
            }}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>View Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  // Set up real-time subscription
  useEffect(() => {
    console.log('⭐⭐⭐ Setting up Supabase realtime subscription ⭐⭐⭐');
    // Make sure we're using a unique channel name per component instance
    const channelName = `queue-changes-${Math.random().toString(36).substring(2, 10)}`;
    addLog(`Creating channel with name: ${channelName}`);
    
    try {
      // First remove any existing subscription to prevent duplicates
      if (subscription.current) {
        addLog('Cleaning up previous subscription...');
        supabase.removeChannel(subscription.current);
      }
      
      // Set up a new channel with debug output
      addLog('Creating new subscription channel...');
      
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'research_active_queue',
          }, (payload) => {
            addLog(`⚡ Realtime event received: ${payload.eventType} for ${payload.table}`);
            console.log('Payload:', JSON.stringify(payload, null, 2));
            
            // Log Supabase client info
            addLog(`Connection details: ${Platform.OS}, ${supabase.realtime.getToken()}`);
            
            // Fetch the updated data regardless of event type
            fetchLatestData(true);
          })
        .subscribe((status, err) => {
          addLog(`Subscription status: ${status}`);
          if (err) {
            addLog(`Subscription error: ${err.message}`);
            console.error('Subscription error:', err);
          }
        });
      
      // Test that the subscription is working
      addLog('Testing subscription connection...');
      setTimeout(() => {
        addLog('Connection active: ' + (supabase.realtime.isConnected() ? 'Yes' : 'No'));
      }, 2000);
      
      // Store the channel reference for cleanup
      subscription.current = channel;
      
      return () => {
        addLog('Cleaning up subscription...');
        if (subscription.current) {
          supabase.removeChannel(subscription.current);
        }
      };
    } catch (err: any) {
      addLog(`Error setting up subscription: ${err.message}`);
      console.error('Subscription setup error:', err);
      return () => {};
    }
  }, []);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar === 'light' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goBack}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Active Research Queue
        </Text>
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={syncAllPendingResearch}
        >
          <MaterialIcons name="sync" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Button container */}
        <View style={styles.buttonContainer}>
          {/* Create Test Button */}
          <TouchableOpacity 
            style={styles.createButton}
            onPress={createTestResearch}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.createButtonGradient}
            >
              <MaterialIcons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Test Research</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Direct Insert Test Button */}
          <TouchableOpacity 
            style={styles.directButton}
            onPress={insertDirectly}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.createButtonGradient}
            >
              <MaterialIcons name="bolt" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Direct Insert (Bypass Trigger)</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Queue List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading active research...
            </Text>
          </View>
        ) : (
          <>
            {queueItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inbox" size={64} color={theme.secondaryText} />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  No active research found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.secondaryText }]}>
                  Create a test research to see it here
                </Text>
              </View>
            ) : (
              <FlatList
                data={queueItems}
                renderItem={renderQueueItem}
                keyExtractor={(item) => item.research_id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
      
      {/* Logs Section */}
      <View style={[styles.logsContainer, { backgroundColor: theme.card }]}>
        <View style={styles.logsHeader}>
          <Text style={[styles.logsTitle, { color: theme.text }]}>Debug Logs</Text>
          <TouchableOpacity 
            onPress={() => setLogs([])}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.logsList}
          contentContainerStyle={styles.logsContent}
        >
          {logs.length === 0 ? (
            <Text style={[styles.emptyLogs, { color: theme.secondaryText }]}>
              No logs yet. Actions will be logged here.
            </Text>
          ) : (
            logs.map((log, index) => (
              <Text 
                key={index} 
                style={[styles.logEntry, { color: theme.secondaryText }]}
              >
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
      
      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  syncButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'column',
    marginBottom: 16,
    width: '100%',
  },
  createButton: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 16,
  },
  cardContainer: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  idText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  completeButton: {
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 8,
  },
  viewButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  logsContainer: {
    height: 200,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    padding: 12,
  },
  emptyLogs: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  directButton: {
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
}); 
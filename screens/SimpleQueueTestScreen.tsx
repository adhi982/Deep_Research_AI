import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../context/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Simple interface matching the table
interface QueueItem {
  research_id: string;
  user_id: string;
  status: string;
  created_at: string;
  agent?: string;
  title?: string;
}

export default function SimpleQueueTestScreen() {
  console.log('SimpleQueueTestScreen loaded');
  
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const subscription = useRef<any>(null);
  
  // Log helper
  const addLog = (message: string) => {
    console.log(`[SimpleQueueTest] ${message}`);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };
  
  // Initial load
  useEffect(() => {
    addLog('Component mounted - fetching data');
    fetchQueue();
    
    return () => {
      addLog('Component unmounting');
    };
  }, []);
  
  // Setup realtime subscription
  useEffect(() => {
    addLog('Setting up realtime subscription');
    
    const channel = supabase.channel('queue-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'research_active_queue'
      }, (payload) => {
        addLog(`Realtime event: ${payload.eventType}`);
        fetchQueue();
      })
      .subscribe();
    
    subscription.current = channel;
    
    return () => {
      addLog('Removing realtime subscription');
      if (subscription.current) {
        supabase.removeChannel(subscription.current);
      }
    };
  }, []);
  
  // Fetch queue data directly
  const fetchQueue = async () => {
    addLog('Fetching queue data');
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('research_active_queue')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      addLog(`Fetched ${data?.length || 0} queue items`);
      setQueueItems(data || []);
    } catch (err: any) {
      addLog(`Error fetching queue: ${err.message}`);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render an item
  const renderItem = ({ item }: { item: QueueItem }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {item.title || 'Untitled Research'}
        </Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.status === 'pending' ? '#10B981' : '#6B7280' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={[styles.cardId, { color: theme.secondaryText }]} numberOfLines={1}>
        ID: {item.research_id}
      </Text>
      
      <Text style={[styles.cardDate, { color: theme.secondaryText }]}>
        Created: {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar === 'light' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Queue Test (Direct Access)
        </Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchQueue}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading queue items...
          </Text>
        </View>
      ) : (
        <FlatList
          data={queueItems}
          renderItem={renderItem}
          keyExtractor={item => item.research_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="list-alt" size={48} color={theme.secondaryText} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                No queue items found
              </Text>
            </View>
          }
        />
      )}
      
      <View style={[styles.logsContainer, { backgroundColor: theme.card }]}>
        <View style={styles.logsHeader}>
          <Text style={[styles.logsTitle, { color: theme.text }]}>Logs</Text>
          <TouchableOpacity onPress={() => setLogs([])}>
            <Text style={[styles.clearButton, { color: theme.accent }]}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.logs}>
          {logs.map((log, index) => (
            <Text key={index} style={[styles.logItem, { color: theme.secondaryText }]}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={20} color="#FF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={() => setError(null)}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'flex-end',
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    width: 100,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardId: {
    fontSize: 12,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  logsContainer: {
    height: 150,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  logsTitle: {
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 4,
  },
  logs: {
    flex: 1,
    padding: 8,
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFEEEE',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#CC0000',
    flex: 1,
    marginLeft: 8,
  },
  dismissButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dismissText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Button
} from 'react-native';
import { supabase } from '../utils/supabase';
import { useNavigation } from '@react-navigation/native';

// Define a type for the research item
interface ResearchItem {
  research_id: string;
  user_id: string;
  agent: string;
  query: string;
  status: string;
  created_at: string;
  [key: string]: any; // Allow for other properties
}

// Simple test screen to verify Supabase data fetching
export default function TestResearchQueueScreen() {
  const [data, setData] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [insertLoading, setInsertLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('Never');
  const navigation = useNavigation();

  // Function to test fetch
  const testFetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('TEST SCREEN: Fetching data from Supabase...');
      
      // Direct query with explicit select - matching EXACTLY what QueueScreen uses
      const { data: fetchedData, error: fetchError } = await supabase
        .from('research_history_new')
        .select('research_id, user_id, agent, query, status, created_at')
        .in('status', ['pending', 'researching', 'in_progress'])
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('TEST SCREEN: Fetch error:', fetchError);
        setError(fetchError.message);
        setData([]);
      } else {
        console.log('TEST SCREEN: Fetch successful. Records count:', fetchedData?.length);
        if (fetchedData && fetchedData.length > 0) {
          console.log('TEST SCREEN: First record status:', fetchedData[0].status);
          console.log('TEST SCREEN: First 2 records:', fetchedData.slice(0, 2));
        }
        setData(fetchedData || []);
      }
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (catchError) {
      console.error('TEST SCREEN: Exception caught:', catchError);
      setError(String(catchError));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to insert a test pending item
  const insertTestPendingItem = async () => {
    setInsertLoading(true);
    try {
      console.log('TEST SCREEN: Creating new test pending research item...');
      
      const researchId = `test-${Date.now()}`;
      const currentTime = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('research_history_new')
        .insert({
          research_id: researchId,
          user_id: 'test-user-123',
          agent: 'Test Agent',
          query: `Test query created at ${new Date().toLocaleTimeString()}`,
          breadth: 3,
          depth: 3,
          include_technical_terms: true,
          output_format: 'markdown',
          status: 'pending', // IMPORTANT: using 'pending' status to test the filter
          created_at: currentTime
        })
        .select();
        
      if (error) {
        console.error('TEST SCREEN: Error inserting test item:', error);
        setError(`Error creating test item: ${error.message}`);
      } else {
        console.log('TEST SCREEN: Successfully inserted test pending item');
        // Refresh the data to show the new item
        testFetch();
      }
    } catch (catchError) {
      console.error('TEST SCREEN: Exception during insert:', catchError);
      setError(`Exception during insert: ${String(catchError)}`);
    } finally {
      setInsertLoading(false);
    }
  };

  // First-time load
  useEffect(() => {
    testFetch();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Supabase Test Screen</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Go Back</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.controls}>
        <View style={styles.buttonsRow}>
          <Button 
            title="Refresh Data" 
            onPress={testFetch} 
            disabled={loading}
          />
          <Button
            title="Add Test Item"
            onPress={insertTestPendingItem}
            disabled={insertLoading}
            color="#4caf50"
          />
        </View>
        <Text style={styles.timestamp}>Last updated: {lastUpdated}</Text>
      </View>
      
      {(loading || insertLoading) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>
            {loading ? 'Fetching from Supabase...' : 'Creating test item...'}
          </Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        <Text style={styles.resultsTitle}>
          Results: {data.length} records
        </Text>
        
        {data.map((item, index) => (
          <View key={item.research_id || index} style={styles.dataItem}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemId}>ID: {item.research_id}</Text>
              <Text style={[
                styles.itemStatus, 
                { color: getStatusColor(item.status) }
              ]}>
                {item.status}
              </Text>
            </View>
            
            <Text style={styles.itemQuery} numberOfLines={2}>
              {item.query}
            </Text>
            
            <View style={styles.itemFooter}>
              <Text style={styles.itemAgent}>{item.agent}</Text>
              <Text style={styles.itemDate}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
        
        {data.length === 0 && !loading && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#ff9800';
    case 'in_progress':
    case 'researching':
      return '#2196f3';
    case 'completed':
      return '#4caf50';
    default:
      return '#9e9e9e';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    color: '#fff',
    fontWeight: 'bold',
  },
  controls: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
  },
  scrollView: {
    flex: 1,
  },
  resultsTitle: {
    padding: 16,
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
  },
  dataItem: {
    margin: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemId: {
    fontSize: 12,
    color: '#666',
  },
  itemStatus: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  itemQuery: {
    fontSize: 16,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemAgent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  itemDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#757575',
    fontSize: 16,
  },
}); 
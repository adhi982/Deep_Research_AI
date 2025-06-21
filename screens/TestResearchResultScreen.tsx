import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner-native';
import { fetchResearchByIdWithCache } from '../utils/researchService';

// Debug test screen for research result issues
export default function TestResearchResultScreen() {
  const navigation = useNavigation();
  const [inputId, setInputId] = useState('');
  const [researchId, setResearchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultFound, setResultFound] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [researchData, setResearchData] = useState<any>(null);
  const [resultData, setResultData] = useState<any>(null);
  const supabaseSubscriptionRef = useRef<any>(null);

  // Add a log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry); // Also log to console for native debugging
    setLogs(prevLogs => [logEntry, ...prevLogs]);
  };

  // Extract research_id from result_id if needed
  const getResearchId = async (id: string) => {
    // Check if the ID looks like a result ID (starts with "result-")
    if (id.startsWith('result-')) {
      addLog(`ID appears to be a result_id: ${id}`);
      
      // Try to find the corresponding research_id
      try {
        const { data, error } = await supabase
          .from('research_results_new')
          .select('research_id')
          .eq('result_id', id)
          .single();
        
        if (error) {
          addLog(`Error fetching research_id for result: ${error.message}`);
          return null;
        }
        
        if (data && data.research_id) {
          addLog(`Found research_id: ${data.research_id} for result_id: ${id}`);
          return data.research_id;
        } else {
          addLog('No research_id found for this result_id');
          return null;
        }
      } catch (err: any) {
        addLog(`Error: ${err.message}`);
        return null;
      }
    }
    
    // If it doesn't look like a result ID, assume it's a research ID
    return id;
  };

  // Set up realtime subscription
  useEffect(() => {
    addLog('Setting up realtime subscription for research results');
    
    // Subscribe to research_results_new changes
    const resultsChannel = supabase
      .channel('test-realtime-results')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'research_results_new' },
        (payload) => {
          addLog(`Realtime update received: ${payload.eventType}`);
          
          if (researchId && payload.new && payload.new.research_id === researchId) {
            addLog('✨ Realtime result update for current research!');
            
            // Update result data if we're looking at this research
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setResultData(payload.new);
              setResultFound(true);
              setError(null);
              toast.success('Research result updated in real-time!');
            }
          }
        }
      )
      .subscribe();
      
    // Store subscription for cleanup
    supabaseSubscriptionRef.current = resultsChannel;
    
    return () => {
      addLog('Cleaning up realtime subscription');
      if (supabaseSubscriptionRef.current) {
        supabase.removeChannel(supabaseSubscriptionRef.current);
      }
    };
  }, [researchId]);

  // Test fetching research by ID
  const testFetchResearch = async () => {
    if (!researchId) {
      addLog('Please enter a research ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResultFound(false);
      
      // Clear logs for a fresh test
      setLogs([]);
      
      const resolvedResearchId = researchId.trim();
      addLog(`Fetching research with ID: ${resolvedResearchId}`);
      
      // 1. Use our new cached method to fetch research by ID
      addLog('Fetching from research_history_new with cache...');
      const research = await fetchResearchByIdWithCache(resolvedResearchId);
      
      if (!research) {
        addLog('No research history found with this ID');
        setError('Research not found in history table');
        setIsLoading(false);
        return;
      }
      
      addLog(`✅ Research history found successfully!`);
      setResearchData(research);
      
      // 2. Fetch from research_results_new table - without using .single()
      addLog('Fetching from research_results_new...');
      const { data: resultsData, error: resultError } = await supabase
        .from('research_results_new')
        .select('*')
        .eq('research_id', resolvedResearchId);
        
      if (resultError) {
        addLog(`Error fetching research result: ${resultError.message}`);
        setError(`Result error: ${resultError.message}`);
      } else if (!resultsData || resultsData.length === 0) {
        addLog('No research results found with this ID');
        setError('Result not found in results table');
      } else {
        addLog(`✅ Research results found successfully! (${resultsData.length} results)`);
        // Use the most recent result (assuming created_at is available)
        const sortedResults = [...resultsData].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setResultData(sortedResults[0]);
        setResultFound(true);
        setError(null);
      }
    } catch (err: any) {
      addLog(`Unexpected error: ${err.message || 'Unknown error'}`);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to real result screen with the research ID
  const navigateToResultScreen = () => {
    if (!researchId) {
      Alert.alert('Error', 'Please test fetch first to get a valid research ID');
      return;
    }

    addLog(`Navigating to ResearchResultScreen with both param formats: researchId=${researchId} and research_id=${researchId}`);
    // Navigate to the actual result screen with both parameter formats for maximum compatibility
    navigation.navigate('ResearchResultScreen', { 
      researchId: researchId,
      research_id: researchId 
    });
  };

  // Navigate to progress screen (testing backward flow)
  const navigateToProgressScreen = () => {
    if (!researchId) {
      Alert.alert('Error', 'Please test fetch first to get a valid research ID');
      return;
    }

    addLog(`Navigating to ResearchProgressScreen with param: research_id=${researchId}`);
    // Navigate to the progress screen
    navigation.navigate('ResearchProgressScreen', { research_id: researchId });
  };

  // Create test data for this research
  const createTestResult = async () => {
    if (!researchId) {
      Alert.alert('Error', 'Please test fetch first to get a valid research ID');
      return;
    }

    setIsLoading(true);
    addLog(`Creating test result for research_id: ${researchId}`);

    try {
      const resultId = `result-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const testUserId = researchData?.user_id || 'test-user-123';
      
      const { error } = await supabase
        .from('research_results_new')
        .insert({
          result_id: resultId,
          research_id: researchId,
          user_id: testUserId,
          result: `# Test Result\n\nThis is a test result created at ${new Date().toLocaleString()} for research ID: ${researchId}.\n\n## Sample Section\n\nThis demonstrates markdown formatting in the result content.`,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        addLog(`Error creating test result: ${error.message}`);
        setError(`Failed to create test result: ${error.message}`);
      } else {
        addLog(`✅ Test result created successfully with ID: ${resultId}`);
        toast.success('Test result created - watch for realtime update!');
      }
    } catch (err: any) {
      addLog(`Error creating test result: ${err.message}`);
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Research Result Test</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Test Research Results Flow</Text>
          <Text style={styles.description}>
            This tool helps debug issues with the research results display.
            Enter a research ID or result ID to test fetching and navigation.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Research ID or Result ID"
            placeholderTextColor="#777"
            value={researchId}
            onChangeText={setResearchId}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.testButton]}
              onPress={testFetchResearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Test Fetch</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.navigateButton, !researchId && styles.disabledButton]}
              onPress={navigateToResultScreen}
              disabled={isLoading || !researchId}
            >
              <Text style={styles.buttonText}>View Results</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.progressButton, !researchId && styles.disabledButton]}
              onPress={navigateToProgressScreen}
              disabled={isLoading || !researchId}
            >
              <Text style={styles.buttonText}>View Progress</Text>
            </TouchableOpacity>
          </View>

          {researchId && (
            <TouchableOpacity 
              style={styles.createButton}
              onPress={createTestResult}
              disabled={isLoading || !researchId}
            >
              <Text style={styles.createButtonText}>Create Test Result (Triggers Realtime)</Text>
            </TouchableOpacity>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error" size={20} color="#FF4B4B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {resultFound && (
            <View style={styles.successContainer}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>Research result found!</Text>
            </View>
          )}

          {researchId && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Current Research ID:</Text>
              <Text style={styles.infoValue}>{researchId}</Text>
            </View>
          )}
        </View>

        {/* Result Data Preview */}
        {researchData && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Research History Data</Text>
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>ID:</Text>
              <Text style={styles.dataValue}>{researchData.research_id}</Text>
            </View>
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Query:</Text>
              <Text style={styles.dataValue}>{researchData.query}</Text>
            </View>
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Status:</Text>
              <Text style={styles.dataValue}>{researchData.status}</Text>
            </View>
          </View>
        )}

        {resultData && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Result Data Preview</Text>
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Result ID:</Text>
              <Text style={styles.dataValue}>{resultData.result_id}</Text>
            </View>
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Content:</Text>
              <Text style={styles.dataValue} numberOfLines={3}>{resultData.result}</Text>
            </View>
          </View>
        )}

        {/* Debug Logs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Debug Logs</Text>
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={styles.emptyLogText}>No logs yet. Run a test to see logs.</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logEntry}>{log}</Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  testButton: {
    backgroundColor: '#6366f1',
  },
  navigateButton: {
    backgroundColor: '#8b5cf6',
  },
  progressButton: {
    backgroundColor: '#3b82f6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF4B4B',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#4CAF50',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoLabel: {
    color: '#93c5fd',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  emptyLogText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  dataContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginRight: 8,
    width: 80,
  },
  dataValue: {
    fontSize: 14,
    color: '#e2e8f0',
    flex: 1,
  },
}); 
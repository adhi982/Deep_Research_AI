import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../utils/supabase';
import { markResearchAsComplete } from '../TestWebhook';

const TestProgressScreen = () => {
  const navigation = useNavigation<any>();
  
  // State variables
  const [researchId, setResearchId] = useState(`test-research-${Date.now()}`);
  const [userId, setUserId] = useState(`test-user-${Date.now()}`);
  const [topic, setTopic] = useState('Test Topic');
  const [linkUrl, setLinkUrl] = useState('https://example.com/test');
  const [linkTitle, setLinkTitle] = useState('Example Test Link');
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [useViewScreen, setUseViewScreen] = useState(true);
  
  // Add log entry
  const addLog = (message: string) => {
    setLogs(prevLogs => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prevLogs]);
  };
  
  // Generate a topic ID that's compatible with the table
  const generateTopicId = () => {
    return `topic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  };
  
  // Add a function to check if research history exists
  const checkResearchHistoryExists = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('research_history_new')
        .select('research_id')
        .eq('research_id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') { // Code for "no rows returned"
          return false;
        }
        throw error;
      }
      
      return true;
    } catch (err) {
      return false;
    }
  };
  
  // Modify createResearchHistoryEntry to check first
  const createResearchHistoryEntry = async () => {
    try {
      // Check if it already exists
      const exists = await checkResearchHistoryExists(researchId);
      if (exists) {
        addLog(`Research history entry already exists for ID: ${researchId}`);
        return true;
      }
      
      addLog(`Creating research history entry for ID: ${researchId}`);
      
      const { data, error } = await supabase
        .from('research_history_new')
        .insert({
          research_id: researchId,
          user_id: userId,
          agent: 'general',
          query: 'Test Research Query',
          breadth: 3,
          depth: 3,
          include_technical_terms: true,
          output_format: 'Research Paper',
          status: 'in_progress',
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) {
        addLog(`Error creating research history: ${error.message}`);
        return false;
      }
      
      addLog(`Successfully created research history entry`);
      return true;
    } catch (err: any) {
      addLog(`Unexpected error creating research history: ${err.message || String(err)}`);
      return false;
    }
  };
  
  // Add a handler for preparing research environment
  const handlePrepareResearch = async () => {
    try {
      setIsLoading(true);
      addLog(`Preparing research environment for ID: ${researchId}`);
      
      const success = await createResearchHistoryEntry();
      if (success) {
        addLog('Research environment prepared successfully');
        Alert.alert('Success', 'Research environment prepared. You can now create topics.');
      } else {
        addLog('Failed to prepare research environment');
        Alert.alert('Error', 'Failed to prepare research environment. See logs for details.');
      }
    } catch (error: any) {
      addLog(`Error preparing research: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to prepare research: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Modify the handleCreateTopic function to create research history first
  const handleCreateTopic = async () => {
    try {
      setIsLoading(true);
      addLog(`Creating new topic: "${topic}"`);
      
      // First ensure research history entry exists
      const historyExists = await createResearchHistoryEntry();
      if (!historyExists) {
        addLog('Warning: Could not create research history entry, but will try to create topic anyway');
      }
      
      const topicId = generateTopicId();
      addLog(`Generated topic ID: ${topicId}`);
      
      const { data, error } = await supabase
        .from('research_progress_new')
        .insert({
          progress_id: topicId,
          research_id: researchId,
          user_id: userId,
          topic: topic,
          links: [], // Start with empty links array
          created_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      setCurrentTopicId(topicId);
      addLog(`Successfully created topic with ID: ${topicId}`);
      Alert.alert('Success', `Created topic: ${topic}`);
    } catch (error: any) {
      addLog(`Error creating topic: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to create topic: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a link to the current topic
  const handleAddLink = async () => {
    if (!currentTopicId) {
      Alert.alert('Error', 'Please create a topic first');
      return;
    }
    
    try {
      setIsLoading(true);
      addLog(`Adding link to topic ${currentTopicId}: ${linkTitle}`);
      
      // First get the current topic data
      const { data: topicData, error: fetchError } = await supabase
        .from('research_progress_new')
        .select('links')
        .eq('progress_id', currentTopicId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Add the new link to the existing links array
      const currentLinks = Array.isArray(topicData.links) ? topicData.links : [];
      const updatedLinks = [
        ...currentLinks,
        { url: linkUrl, title: linkTitle }
      ];
      
      // Update the topic with the new links array
      const { data, error } = await supabase
        .from('research_progress_new')
        .update({ links: updatedLinks })
        .eq('progress_id', currentTopicId)
        .select();
      
      if (error) {
        throw error;
      }
      
      addLog(`Successfully added link: ${linkTitle}`);
      Alert.alert('Success', `Added link: ${linkTitle}`);
      
      // Clear link fields for next entry
      setLinkUrl('https://example.com/test');
      setLinkTitle('Example Test Link');
    } catch (error: any) {
      addLog(`Error adding link: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to add link: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a new function to handle adding a link via RPC
  const handleAddLinkViaRPC = async () => {
    if (!currentTopicId) {
      Alert.alert('Error', 'Please create a topic first');
      return;
    }
    
    try {
      setIsLoading(true);
      addLog(`Adding link to topic ${currentTopicId} via RPC: ${linkTitle}`);
      
      // Call the add_link_to_topic RPC function
      const { data, error } = await supabase.rpc('add_link_to_topic', {
        p_progress_id: currentTopicId,
        p_url: linkUrl,
        p_title: linkTitle
      });
      
      if (error) {
        throw error;
      }
      
      addLog(`Successfully added link via RPC: ${linkTitle}`);
      Alert.alert('Success', `Added link via RPC: ${linkTitle}`);
      
      // Clear link fields for next entry
      setLinkUrl('https://example.com/test');
      setLinkTitle('Example Test Link');
    } catch (error: any) {
      addLog(`Error adding link via RPC: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to add link via RPC: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // View the research progress screen
  const handleViewProgress = () => {
    navigation.navigate('ResearchProgressScreen', {
      research_id: researchId,
      query: 'Test Research Query',
      breadth: 3,
      depth: 3
    });
  };
  
  // Also update handleCreateSampleData to create research history first
  const handleCreateSampleData = async () => {
    try {
      setIsLoading(true);
      addLog('Creating sample data set...');
      
      // First ensure research history entry exists
      const historyExists = await createResearchHistoryEntry();
      if (!historyExists) {
        addLog('Warning: Could not create research history entry, but will try to continue anyway');
      }
      
      // Sample topics
      const sampleTopics = [
        {
          topic: 'Introduction to the Topic',
          links: [
            { url: 'https://example.com/intro1', title: 'Basic Overview' },
            { url: 'https://example.com/intro2', title: 'Historical Context' }
          ]
        },
        {
          topic: 'Key Concepts and Principles',
          links: [
            { url: 'https://example.com/concepts1', title: 'Fundamental Principles' },
            { url: 'https://example.com/concepts2', title: 'Theoretical Framework' },
            { url: 'https://example.com/concepts3', title: 'Mathematical Foundations' }
          ]
        },
        {
          topic: 'Current Applications',
          links: [
            { url: 'https://example.com/apps1', title: 'Industry Applications' },
            { url: 'https://example.com/apps2', title: 'Research Directions' }
          ]
        }
      ];
      
      // Create each topic with delay
      for (let i = 0; i < sampleTopics.length; i++) {
        const topicData = sampleTopics[i];
        const topicId = generateTopicId();
        
        addLog(`Creating topic ${i+1}/${sampleTopics.length}: ${topicData.topic}`);
        
        // Insert the topic with links
        const { error } = await supabase
          .from('research_progress_new')
          .insert({
            progress_id: topicId,
            research_id: researchId,
            user_id: userId,
            topic: topicData.topic,
            links: topicData.links,
            created_at: new Date().toISOString()
          });
        
        if (error) {
          throw error;
        }
        
        addLog(`Created topic: ${topicData.topic}`);
        
        // Wait before creating next topic to simulate research flow
        if (i < sampleTopics.length - 1) {
          addLog('Waiting 2 seconds before next topic...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      addLog('Sample data creation completed successfully!');
      Alert.alert(
        'Success', 
        'Sample data created successfully!',
        [
          { 
            text: 'View Progress', 
            onPress: handleViewProgress 
          },
          { 
            text: 'OK' 
          }
        ]
      );
    } catch (error: any) {
      addLog(`Error creating sample data: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to create sample data: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update clear all test data function to clean up research history too
  const handleClearData = async () => {
    try {
      setIsLoading(true);
      addLog(`Clearing all data for research ID: ${researchId}`);
      
      // Delete progress data first (child table)
      const { error: progressError } = await supabase
        .from('research_progress_new')
        .delete()
        .eq('research_id', researchId);
      
      if (progressError) {
        addLog(`Warning: Error clearing progress data: ${progressError.message}`);
      } else {
        addLog('Successfully cleared progress data');
      }
      
      // Then try to delete history entry (parent table)
      const { error: historyError } = await supabase
        .from('research_history_new')
        .delete()
        .eq('research_id', researchId);
      
      if (historyError) {
        addLog(`Warning: Error clearing history data: ${historyError.message}`);
      } else {
        addLog('Successfully cleared history data');
      }
      
      setCurrentTopicId(null);
      addLog('Test data cleanup completed');
      Alert.alert('Success', 'All test data has been cleared');
    } catch (error: any) {
      addLog(`Error clearing data: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to clear data: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new function for manually marking research as complete
  const handleMarkAsComplete = async () => {
    try {
      setIsLoading(true);
      addLog(`Marking research ID: ${researchId} as complete`);
      
      const success = await markResearchAsComplete(researchId, userId);
      
      if (success) {
        addLog('Successfully marked research as complete!');
        Alert.alert('Success', 'Research has been marked as complete with a final topic.');
      } else {
        addLog('Failed to mark research as complete');
        Alert.alert('Error', 'Failed to mark research as complete. See logs for details.');
      }
    } catch (error: any) {
      addLog(`Error marking research as complete: ${error.message || String(error)}`);
      Alert.alert('Error', `Failed to mark as complete: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <MaterialIcons name="science" size={24} color="#fff" />
          <Text style={styles.headerText}>Test Progress Screen</Text>
        </View>
      </LinearGradient>
      
      {/* Configuration Section */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          
          <Text style={styles.label}>Research ID:</Text>
          <TextInput
            style={styles.input}
            value={researchId}
            onChangeText={setResearchId}
            placeholder="Enter research ID"
            placeholderTextColor="#94a3b8"
          />
          
          <Text style={styles.label}>User ID:</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter user ID"
            placeholderTextColor="#94a3b8"
          />
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>
              Navigate to screen after creation:
            </Text>
            <Switch
              value={useViewScreen}
              onValueChange={setUseViewScreen}
              trackColor={{ false: '#334155', true: '#6366F1' }}
              thumbColor={useViewScreen ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.prepareButton]}
            onPress={handlePrepareResearch}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Prepare Research</Text>
          </TouchableOpacity>
        </View>
        
        {/* Topic Creation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Topic</Text>
          
          <Text style={styles.label}>Topic Name:</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="Enter topic name"
            placeholderTextColor="#94a3b8"
          />
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleCreateTopic}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Create Topic</Text>
          </TouchableOpacity>
        </View>
        
        {/* Link Addition Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Link to Current Topic</Text>
          <Text style={styles.currentTopic}>
            Current Topic ID: {currentTopicId || "None (create a topic first)"}
          </Text>
          
          <Text style={styles.label}>Link URL:</Text>
          <TextInput
            style={styles.input}
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="Enter link URL"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
          
          <Text style={styles.label}>Link Title:</Text>
          <TextInput
            style={styles.input}
            value={linkTitle}
            onChangeText={setLinkTitle}
            placeholder="Enter link title"
            placeholderTextColor="#94a3b8"
          />
          
          <TouchableOpacity
            style={[styles.button, !currentTopicId && styles.disabledButton]}
            onPress={handleAddLink}
            disabled={isLoading || !currentTopicId}
          >
            <Text style={styles.buttonText}>Add Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, !currentTopicId && styles.disabledButton, styles.rpcButton]}
            onPress={handleAddLinkViaRPC}
            disabled={isLoading || !currentTopicId}
          >
            <Text style={styles.buttonText}>Add Link via RPC</Text>
          </TouchableOpacity>
        </View>
        
        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.viewButton]}
            onPress={handleViewProgress}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>View Progress Screen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateSampleData}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Create Sample Data Set</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={handleMarkAsComplete}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Mark Research as Complete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearData}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Clear All Test Data</Text>
          </TouchableOpacity>
        </View>
        
        {/* Logs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logs</Text>
          
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={styles.emptyLog}>No logs yet. Actions will be logged here.</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logEntry}>{log}</Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  currentTopic: {
    fontSize: 13,
    color: '#6366F1',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  viewButton: {
    backgroundColor: '#6366F1',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  disabledButton: {
    backgroundColor: '#475569',
    opacity: 0.7,
  },
  logsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    maxHeight: 200,
  },
  emptyLog: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
  },
  logEntry: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
    paddingVertical: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#e2e8f0',
    marginTop: 12,
    fontSize: 16,
  },
  rpcButton: {
    backgroundColor: '#8B5CF6',
    marginTop: 8,
  },
  prepareButton: {
    backgroundColor: '#10B981',
    marginTop: 12,
  },
  completeButton: {
    backgroundColor: '#10B981',
    marginBottom: 8,
  },
});

export default TestProgressScreen; 
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, Alert, ActivityIndicator, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { toast } from 'sonner-native';
import sendResearchQuery from '../backend/services/sendResearchQuery';
import { generateUserId } from '../utils/supabase';
import { useUser } from '../context/UserContext';

// n8n webhook URL - direct approach
const WEBHOOK_URL = 'https://atomic123.app.n8n.cloud/webhook-test/055cedaa-a313-4625-a41c-7e7f9560b7a3';

// Define types for route params
type AgentData = {
  id: string;
  name?: string;
  description?: string;
};

type RouteParams = {
  agent?: AgentData;
};

interface ResearchScreenProps {
  route?: RouteProp<Record<string, RouteParams>, string>;
}

export default function ResearchParametersScreen({ route }: ResearchScreenProps) {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [breadth, setBreadth] = useState(3);
  const [depth, setDepth] = useState(3);
  const [includeTechnicalTerms, setIncludeTechnicalTerms] = useState(false);
  const [outputType, setOutputType] = useState('Research Paper');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Animation values
  const [breadthAnimValue] = useState(new Animated.Value(3));
  const [depthAnimValue] = useState(new Animated.Value(3));
  
  // Update animation values when sliders change
  useEffect(() => {
    Animated.timing(breadthAnimValue, {
      toValue: breadth,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [breadth]);
  
  useEffect(() => {
    Animated.timing(depthAnimValue, {
      toValue: depth,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [depth]);

  // Get the agent data from the route params
  const agentData = route?.params?.agent || { id: 'general' };

  const outputOptions = ['Research Paper', 'Blog', 'Essay', 'Case Study'];

  // Debug function that calls webhook directly with axios
  const testWebhook = async () => {
    console.log('[DEBUG] Testing webhook directly');
    setDebugInfo('Testing webhook...');
    
    try {
      const testData = {
        user_id: "test-user-debug-123",
        agent: "general",
        query: "Test query from debug button",
        breadth: 3,
        depth: 3,
        include_technical_terms: true,
        output_format: "Research Paper",
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      console.log('[DEBUG] Test data:', JSON.stringify(testData));
      
      // Direct axios request to webhook
      const response = await axios.post(WEBHOOK_URL, testData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[DEBUG] Test response:', response.status, JSON.stringify(response.data));
      setDebugInfo(`Webhook test result: SUCCESS\nStatus: ${response.status}\nData: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('[DEBUG] Test webhook error:', error);
      setDebugInfo(`Webhook test error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const { userId } = useUser();

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      console.log('[DEBUG] Starting research submission process');
      
      // Use the global userId if available, otherwise fall back to generating one
      const userIdToUse = userId || await generateUserId();
      console.log('[DEBUG] Using user ID:', userIdToUse);
      
      // Prepare the payload for the API call
      const payload = {
        user_id: userIdToUse,
        agent: agentData.id,
        query,
        breadth,
        depth,
        include_technical_terms: includeTechnicalTerms,
        output_format: outputType
      };
      
      console.log('[DEBUG] Sending research query with payload:', payload);
      
      // Use the combined service that now handles both webhook and database
      const result = await sendResearchQuery(payload);
      
      if (result.success) {
        console.log('[DEBUG] Research query successful!');
        console.log('[DEBUG] Generated research_id:', result.research_id);
        
        // Show success message
        toast.success('Research query submitted successfully!');
        
        // Navigate to the questions screen with the research ID
        navigation.navigate('ResearchQuestionsScreen', {
          research_id: result.research_id,
          query,
          breadth,
          depth,
          includeTechnicalTerms,
          outputType,
          agent: agentData
        });
      } else {
        console.error('[DEBUG] Research query failed:', result.error);
        
        // Show error message
        toast.error(result.error || 'Failed to submit research request. Please try again.');
        
        // Navigate anyway for debugging - would be removed in production
        navigation.navigate('ResearchQuestionsScreen', {
          query,
          breadth,
          depth,
          includeTechnicalTerms,
          outputType,
          agent: agentData
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error in handleSubmit:', error);
      
      // Show error message
      toast.error('An unexpected error occurred. Please try again.');
      
      // Fall back to navigating anyway
      navigation.navigate('ResearchQuestionsScreen', { 
        query, 
        breadth, 
        depth, 
        includeTechnicalTerms, 
        outputType,
        agent: agentData
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentIcon = () => {
    switch (agentData.id) {
      case 'business':
        return <MaterialIcons name="business-center" size={30} color="white" />;
      case 'health':
        return <MaterialIcons name="healing" size={30} color="white" />;
      case 'financial':
        return <MaterialIcons name="attach-money" size={30} color="white" />;
      case 'general':
      default:
        return <MaterialIcons name="psychology" size={30} color="white" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Simplified Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Research Parameters</Text>
        </View>
        
        {/* Empty view for header alignment */}
        <View style={styles.placeholderView} />
      </View>
      
      {/* Agent Info */}
      <View style={styles.agentContainer}>
        <View style={styles.agentIconContainer}>
          {getAgentIcon()}
        </View>
        <View style={styles.agentTextContainer}>
          <Text style={styles.agentTitle}>{agentData.name || 'General Research'}</Text>
          <Text style={styles.agentDescription}>{agentData.description || 'All-purpose research assistant with broad knowledge across many domains.'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.mainContent}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Research Breadth Slider */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.parameterSection}
          >
            <View style={styles.parameterHeader}>
              <Text style={styles.parameterLabel}>Research Breadth</Text>
              <View style={styles.valueBadge}>
                <Text style={styles.valueText}>{breadth}</Text>
              </View>
            </View>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <Animated.View 
                  style={[
                    styles.sliderFill, 
                    { 
                      width: breadthAnimValue.interpolate({
                        inputRange: [1, 5],
                        outputRange: ['20%', '100%']
                      }) 
                    }
                  ]} 
                >
                  <LinearGradient
                    colors={['#6c63ff', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, borderRadius: 2 }}
                  />
                </Animated.View>
              </View>
              <View style={styles.sliderValues}>
                {[1, 2, 3, 4, 5].map(value => (
                  <TouchableOpacity 
                    key={value} 
                    onPress={() => setBreadth(value)}
                    style={[
                      styles.sliderValue,
                      breadth >= value && styles.filledSliderValue,
                      breadth === value && styles.activeSliderValue
                    ]}
                  >
                    <MotiView
                      animate={{
                        scale: breadth === value ? 1.2 : 1
                      }}
                      transition={{
                        type: 'spring',
                        damping: 10,
                        stiffness: 100
                      }}
                    >
                      <Text style={[
                        styles.sliderValueText,
                        breadth >= value && styles.filledSliderValueText
                      ]}>{value}</Text>
                    </MotiView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </MotiView>

          {/* Research Depth Slider */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 100 }}
            style={styles.parameterSection}
          >
            <View style={styles.parameterHeader}>
              <Text style={styles.parameterLabel}>Research Depth</Text>
              <View style={styles.valueBadge}>
                <Text style={styles.valueText}>{depth}</Text>
              </View>
            </View>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <Animated.View 
                  style={[
                    styles.sliderFill, 
                    { 
                      width: depthAnimValue.interpolate({
                        inputRange: [1, 5],
                        outputRange: ['20%', '100%']
                      }) 
                    }
                  ]} 
                >
                  <LinearGradient
                    colors={['#6c63ff', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, borderRadius: 2 }}
                  />
                </Animated.View>
              </View>
              <View style={styles.sliderValues}>
                {[1, 2, 3, 4, 5].map(value => (
                  <TouchableOpacity 
                    key={value} 
                    onPress={() => setDepth(value)}
                    style={[
                      styles.sliderValue,
                      depth >= value && styles.filledSliderValue,
                      depth === value && styles.activeSliderValue
                    ]}
                  >
                    <MotiView
                      animate={{
                        scale: depth === value ? 1.2 : 1
                      }}
                      transition={{
                        type: 'spring',
                        damping: 10,
                        stiffness: 100
                      }}
                    >
                      <Text style={[
                        styles.sliderValueText,
                        depth >= value && styles.filledSliderValueText
                      ]}>{value}</Text>
                    </MotiView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </MotiView>

          {/* Include Technical Terms Toggle */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 200 }}
            style={styles.parameterSection}
          >
            <View style={styles.parameterHeader}>
              <Text style={styles.parameterLabel}>Include Technical Terms</Text>
                <TouchableOpacity 
                style={styles.toggleContainer}
                  onPress={() => setIncludeTechnicalTerms(!includeTechnicalTerms)}
                activeOpacity={0.7}
              >
                <MotiView
                  animate={{
                    backgroundColor: includeTechnicalTerms ? '#6c63ff' : 'rgba(108, 99, 255, 0.2)'
                  }}
                  transition={{
                    type: 'timing',
                    duration: 200
                  }}
                  style={styles.toggleTrack}
                >
                  <MotiView
                    animate={{
                      translateX: includeTechnicalTerms ? 24 : 0
                    }}
                    transition={{
                      type: 'spring',
                      damping: 15,
                      stiffness: 120
                    }}
                    style={styles.toggleThumb}
                  >
                    {includeTechnicalTerms && (
                      <MotiView
                        from={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 200 }}
                      >
                        <Text style={styles.toggleText}>Y</Text>
                      </MotiView>
                    )}
                  </MotiView>
                </MotiView>
                <Text style={styles.toggleLabel}>
                  {includeTechnicalTerms ? "Yes" : "No"}
                </Text>
                </TouchableOpacity>
            </View>
          </MotiView>

          {/* Output Format Dropdown */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 300 }}
            style={styles.parameterSection}
          >
            <Text style={styles.parameterLabel}>Output Format</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={styles.dropdownButtonText}>{outputType}</Text>
              <Ionicons name="chevron-down" size={20} color="white" />
            </TouchableOpacity>
            
            {showDropdown && (
              <View style={styles.dropdownMenu}>
                {outputOptions.map((option) => (
                  <TouchableOpacity 
                    key={option}
                    style={[styles.dropdownItem, option === outputType && styles.dropdownItemActive]}
                    onPress={() => {
                      setOutputType(option);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      option === outputType && styles.dropdownItemTextActive
                    ]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </MotiView>

          {/* Query Input */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 400 }}
            style={styles.queryInputContainer}
          >
            <TextInput
              style={styles.queryInput}
              placeholder="Type your query..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={query}
              onChangeText={setQuery}
              multiline
            />
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
              <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </MotiView>

          {/* Loading indicator */}
          {isLoading && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.loadingContainer}
            >
              <ActivityIndicator size="small" color="#6c63ff" />
              <Text style={styles.loadingText}>Submitting your research query...</Text>
            </MotiView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholderView: {
    width: 40,
  },
  agentContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  agentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  agentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  mainContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
  },
  parameterSection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  parameterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  valueBadge: {
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.4)',
  },
  valueText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  sliderContainer: {
    width: '100%',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#6c63ff',
    shadowOpacity: 0,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 0,
  },
  activeSliderValue: {
    borderColor: '#6c63ff',
    borderWidth: 2,
    shadowOpacity: 0.3,
    elevation: 2,
  },
  filledSliderValue: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  sliderValueText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  filledSliderValueText: {
    color: 'white',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTrack: {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c63ff',
  },
  toggleLabel: {
    marginLeft: 8,
    color: 'white',
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  dropdownButtonText: {
    color: 'white',
    fontSize: 16,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 99, 255, 0.1)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 16,
  },
  dropdownItemTextActive: {
    color: '#6c63ff',
    fontWeight: '600',
  },
  queryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 25,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
  },
  queryInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 8,
    marginRight: 8,
    outlineStyle: 'none',
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  loadingText: {
    marginLeft: 10,
    color: 'white',
    fontWeight: '500',
  },
});
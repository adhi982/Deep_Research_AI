import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  MaterialIcons, 
  FontAwesome5, 
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome
} from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { toast } from 'sonner-native';

// Agent data
const agentData = [
  {
    id: 'general',
    name: 'General Research',
    description: 'All-purpose research assistant with broad knowledge across many domains.',
    icon: <FontAwesome5 name="brain" size={36} color="#fff" />,
    colors: ['#396afc', '#2948ff'],
    capabilities: ['Comprehensive Literature Review', 'Data Analysis', 'Research Planning']
  },
  {
    id: 'business',
    name: 'Business Intelligence',
    description: 'Specialized in market research, business strategy, and competitive analysis.',
    icon: <MaterialIcons name="business-center" size={36} color="#fff" />,
    colors: ['#1A2980', '#26D0CE'],
    capabilities: ['Market Research', 'Competitive Analysis', 'Strategic Planning']
  },
  {
    id: 'health',
    name: 'Health & Biology',
    description: 'Expert in medical research, biotechnology, and health science topics.',
    icon: <FontAwesome name="heartbeat" size={36} color="#fff" />,
    colors: ['#FF416C', '#FF4B2B'],
    capabilities: ['Medical Literature Review', 'Clinical Data Analysis', 'Biotech Research']
  },
  {
    id: 'financial',
    name: 'Financial Analysis',
    description: 'Specializes in economic research, financial modeling, and investment analysis.',
    icon: <MaterialIcons name="attach-money" size={36} color="#fff" />,
    colors: ['#4A00E0', '#8E2DE2'],
    capabilities: ['Economic Trend Analysis', 'Financial Modeling', 'Investment Research']
  },
];

// Agent Card Component
const AgentCard = ({ agent, isSelected, onSelect, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };
  
  // Get base color from the first color in the gradient array
  const baseColor = agent.colors[0];
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 30 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ 
        type: 'timing', 
        duration: 600,
        delay: index * 100
      }}
      style={styles.cardContainer}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onSelect(agent.id)}
        style={[
          styles.cardTouchable,
          isSelected && styles.selectedCardOutline
        ]}
      >
        <Animated.View 
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <View 
            style={[
              styles.cardContent,
              { backgroundColor: `${baseColor}20` } // 20 is hex for 12% opacity
            ]}
          >
            <View style={styles.cardIconContainer}>
              {agent.icon}
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
              )}
            </View>
            
            <Text style={styles.cardTitle}>{agent.name}</Text>
            <Text style={styles.cardDescription}>{agent.description}</Text>
            
            <View style={styles.capabilitiesContainer}>
              {agent.capabilities.map((capability, idx) => (
                <View key={idx} style={[styles.capabilityBadge, { backgroundColor: `${baseColor}15` }]}>
                  <MaterialIcons name="check-circle" size={12} color="#fff" style={styles.capabilityIcon} />
                  <Text style={styles.capabilityText}>{capability}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </MotiView>
  );
};

export default function ChooseAgentScreen() {
  const navigation = useNavigation();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const continueButtonAnim = useRef(new Animated.Value(0)).current;
  
  const handleSelectAgent = (agentId) => {
    setSelectedAgent(agentId);
    
    // Animate the continue button
    Animated.spring(continueButtonAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  const handleContinue = () => {
    if (!selectedAgent) {
      toast.error('Please select a research agent first');
      return;
    }
    
    // Find the selected agent data
    const selectedAgentData = agentData.find(agent => agent.id === selectedAgent);
    
    // Navigate to ResearchParametersScreen with the selected agent data
    navigation.navigate('ResearchParametersScreen', { agent: selectedAgentData });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Simplified Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          {/* Removed Choose Agent text */}
        </View>
        
        <View style={styles.rightPlaceholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.instructionContainer}
        >
          <View style={styles.instructionCard}>
            <MaterialCommunityIcons name="robot-excited" size={24} color="#6c63ff" />
            <Text style={styles.instructionTitle}>Choose Your AI Research Partner</Text>
          </View>
        </MotiView>
        
        <View style={styles.agentGrid}>
          {agentData.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent === agent.id}
              onSelect={handleSelectAgent}
              index={index}
            />
          ))}
        </View>
      </ScrollView>
      
      {/* Continue Button (appears after selection) */}
      <Animated.View
        style={[
          styles.continueButtonContainer,
          {
            transform: [
              { translateY: continueButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0]
              })},
              { scale: continueButtonAnim }
            ],
            opacity: continueButtonAnim
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleContinue}
          style={styles.continueButton}
        >
          <View style={styles.continueButtonContent}>
            <Text style={styles.continueButtonText}>Continue with {selectedAgent ? agentData.find(a => a.id === selectedAgent).name : 'Selected Agent'}</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 40) / 2; // Always show in 2x2 grid

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A14', // Darker background matching DashboardScreen
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced padding
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  headerTitle: {
    alignItems: 'center',
  },
  rightPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 10, // Reduced padding
    paddingBottom: 80, // Give space for the continue button
  },
  instructionContainer: {
    marginBottom: 12, // Reduced margin
  },
  instructionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 12, // Reduced padding
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row', // Changed to row layout
    justifyContent: 'center', // Center content
  },
  instructionTitle: {
    fontSize: 18, // Slightly reduced font size
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10, // Add margin to separate from icon
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  instructionText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  agentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: cardWidth,
    marginBottom: 10, // Reduced margin
  },
  cardTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCardOutline: {
    borderColor: '#6c63ff',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // Reduced shadow opacity
    shadowRadius: 12,
    elevation: 5, // Reduced elevation
  },
  cardContent: {
    padding: 16, // Reduced padding
    alignItems: 'center',
    minHeight: 200, // Reduced height
    // backgroundColor set dynamically
  },
  cardIconContainer: {
    position: 'relative',
    width: 60, // Reduced size
    height: 60, // Reduced size
    borderRadius: 30, // Adjusted for new size
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // More translucent
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Reduced margin
    borderWidth: 1, // Reduced from 2
    borderColor: 'rgba(255, 255, 255, 0.15)', // More translucent
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Reduced shadow
    shadowRadius: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#6c63ff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Subtle text shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  capabilitiesContainer: {
    width: '100%',
    marginTop: 8, // Add small margin
  },
  capabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set dynamically
    borderRadius: 10, // Slightly reduced
    paddingVertical: 4, // Reduced padding
    paddingHorizontal: 8, // Reduced padding
    marginBottom: 6, // Reduced margin
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  capabilityIcon: {
    marginRight: 6,
  },
  capabilityText: {
    fontSize: 12, // Reduced font size
    color: '#fff',
    fontWeight: '500',
  },
  continueButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  continueButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
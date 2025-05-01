import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

// Define our cosmic theme palette to match other screens
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

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 768;
const cardWidth = isSmallScreen ? '90%' : '45%'; // More responsive width

// Create a GlassMorphicCard component for consistent styling
const GlassMorphicCard = ({ 
  children, 
  style, 
  intensity = 15,
  glowColor = COSMIC_THEME.glacialTeal
}: { 
  children: React.ReactNode; 
  style?: any;
  intensity?: number;
  glowColor?: string;
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[{ 
          overflow: 'hidden', 
          borderRadius: 16,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        }, style]}
      >
        <View style={{ 
          backgroundColor: 'rgba(10, 17, 40, 0.5)', 
          opacity: 0.7,
          ...StyleSheet.absoluteFillObject 
        }} />
        {children}
      </BlurView>
    );
  }

  // Android fallback
  return (
    <View style={[{ 
      overflow: 'hidden', 
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(100, 255, 218, 0.15)',
      backgroundColor: 'rgba(10, 17, 40, 0.6)',
      elevation: 5,
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    }, style]}>
      {children}
    </View>
  );
};

const agentData = [
  {
    id: '1',
    name: 'General Research',
    specialty: 'General Research',
    description: 'Handles a broad range of research queries across various topics.',
    gradient: ['#1E3B70', '#29539B'],
    icon: 'search',
    asciiPattern: `· · · ○ ○ · · ·
○ · · · · · ○ ·
· · ○ · · ○ · ·
· · · · · · · ·
○ · · ○ · · ○ ·
· ○ · · · ○ · ·`
  },
  {
    id: '2',
    name: 'Business Research',
    specialty: 'Business Research',
    description: 'Expert in market trends and business research strategies.',
    gradient: ['#134E5E', '#71B280'],
    icon: 'business',
    asciiPattern: `· □ · · · □ · ·
· · · □ □ · · ·
□ · · · · · □ ·
· · □ · · □ · ·
· □ · · · · □ ·
□ · · □ □ · · ·`
  },
  {
    id: '3',
    name: 'Health & Biology',
    specialty: 'Health & Biology',
    description: 'Specializes in healthcare studies and biological research.',
    gradient: ['#5614B0', '#DBD65C'],
    icon: 'healing',
    asciiPattern: `· ♥ · · · ♥ · ·
· · · ♥ ♥ · · ·
♥ · · · · · ♥ ·
· · ♥ · · ♥ · ·
· ♥ · · · · ♥ ·
♥ · · ♥ ♥ · · ·`
  },
  {
    id: '4',
    name: 'Financial Research',
    specialty: 'Financial Research',
    description: 'Focuses on financial analysis and economic research.',
    gradient: ['#2C3E50', '#4CA1AF'],
    icon: 'attach-money',
    asciiPattern: `· $ · · · $ · ·
· · · $ $ · · ·
$ · · · · · $ ·
· · $ · · $ · ·
· $ · · · · $ ·
$ · · $ $ · · ·`
  },
];

interface Agent {
  id: string;
  name: string;
  specialty: string;
  description: string;
  gradient: string[];
  icon: string;
  asciiPattern: string;
}

interface AgentCardProps {
  agent: Agent;
  index: number;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, index }) => {
  const navigation = useNavigation();
  
  const getScreenNameForAgent = (specialty: string): string => {
    const screenMap: Record<string, string> = {
      'General Research': 'GeneralAgentScreen',
      'Business Research': 'BusinessAgentScreen',
      'Health & Biology': 'HealthAgentScreen',
      'Financial Research': 'FinancialAgentScreen'
    };
    
    return screenMap[specialty] || 'GeneralAgentScreen';
  };
  
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 600,
        delay: index * 150,
      } as any}
      style={[styles.agentCardContainer]}
    >
      <GlassMorphicCard style={styles.agentCard} glowColor={agent.gradient[0]}>
        <LinearGradient
          colors={[`${agent.gradient[0]}50`, `${agent.gradient[1]}30`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardPattern}>
            <Text style={styles.asciiPattern}>{agent.asciiPattern}</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <MaterialIcons name={agent.icon} size={isSmallScreen ? 24 : 28} color={COSMIC_THEME.glacialTeal} />
            </View>
            
            <Text style={styles.agentName}>{agent.name}</Text>
            
            <Text style={styles.agentDescription} numberOfLines={2}>
              {agent.description}
            </Text>
            
            <View style={styles.agentActions}>
              <TouchableOpacity 
                style={styles.readMoreButton}
                onPress={() => navigation.navigate(getScreenNameForAgent(agent.specialty))}
              >
                <Text style={styles.readMoreButtonText}>Read More</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.researchButton}
                onPress={() => navigation.navigate('ResearchParametersScreen', { agent })}
              >
                <LinearGradient
                  colors={['rgba(100, 255, 218, 0.8)', 'rgba(59, 130, 246, 0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.researchButtonGradient}
                >
                  <Text style={styles.researchButtonText}>Research</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </GlassMorphicCard>
    </MotiView>
  );
};

export default function AgentListScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[COSMIC_THEME.deeperNavy, COSMIC_THEME.midnightNavy]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.7)', 'rgba(45, 52, 57, 0.5)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.headerPlaceholder} />
      </View>
      
      {/* Main content - Grid of agents */}
      <View style={styles.centerContent}>
        <FlatList
          data={agentData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <AgentCard agent={item} index={index} />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COSMIC_THEME.deeperNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 255, 218, 0.1)',
    backgroundColor: 'rgba(10, 17, 40, 0.8)',
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  headerPlaceholder: {
    width: 40,
  },
  centerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  listContent: {
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: isSmallScreen ? 16 : 24,
  },
  agentCardContainer: {
    width: cardWidth,
    minHeight: 280,
    marginBottom: 24,
  },
  agentCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 17, 40, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.1)',
  },
  cardGradient: {
    flex: 1,
    padding: 20,
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asciiPattern: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 8,
    color: COSMIC_THEME.paleMoonlight,
    letterSpacing: 2,
    lineHeight: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 17, 40, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  agentName: {
    fontSize: 20,
    fontWeight: '700',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 12,
  },
  agentDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 24,
  },
  agentActions: {
    gap: 12,
  },
  readMoreButton: {
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  readMoreButtonText: {
    color: COSMIC_THEME.paleMoonlight,
    fontWeight: '600',
    fontSize: 14,
  },
  researchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  researchButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  researchButtonText: {
    color: COSMIC_THEME.midnightNavy,
    fontWeight: '600',
    fontSize: 14,
  },
});
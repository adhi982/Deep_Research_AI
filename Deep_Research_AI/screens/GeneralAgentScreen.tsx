import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Define our cosmic theme palette (fallback if theme context is not used)
const COSMIC_THEME = {
  midnightNavy: '#0A1128',
  deeperNavy: '#050A18',
  glacialTeal: 'rgba(100, 255, 218, 0.7)',
  burnishedGold: '#FFC107',
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)',
  charcoalSmoke: 'rgba(45, 52, 57, 0.65)',
  paleMoonlight: '#E0E0E0',
  cardBackground: 'rgba(45, 52, 57, 0.45)',
  cardGlow: 'rgba(100, 255, 218, 0.1)',    
  accentGlow: 'rgba(255, 193, 7, 0.15)',   
};

// Create a GlassMorphicCard component for consistent styling
const GlassMorphicCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  intensity?: number;
  glowColor?: string;
}> = ({ 
  children, 
  style, 
  intensity = 15,
  glowColor = COSMIC_THEME.glacialTeal
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

export default function GeneralAgentScreen() {
  const navigation = useNavigation<any>();
  const { themeMode, setThemeMode } = useTheme();
  
  const agentData = {
    id: '1',
    name: 'General Research Assistant',
    specialty: 'General Topics',
    description: 'The General Research Assistant is your comprehensive aide for a wide range of topics, from academic subjects to everyday questions.',
    longDescription: `The General Research Assistant excels at handling diverse research needs with a balanced and methodical approach to information gathering and synthesis.

This agent draws from broad knowledge sources to provide well-rounded, comprehensive answers. It's designed to maintain neutrality while presenting multiple perspectives on complex topics, helping you explore subjects thoroughly without bias.`,
    idealFor: [
      'Students working on varied assignments',
      'Professionals needing broad information',
      'Anyone exploring new topics or interests',
      'Writers researching for content',
      'Anyone seeking balanced perspectives on complex issues'
    ],
    exampleResearch: [
      {
        title: 'Climate Change Mitigation Strategies',
        summary: 'Examination of various approaches to reducing greenhouse gas emissions, including policy solutions, technological innovations, and behavior changes.'
      },
      {
        title: 'The History and Cultural Impact of Chess',
        summary: 'Exploration of chess origins, its evolution across different civilizations, and its influence on strategic thinking and popular culture.'
      },
      {
        title: 'Effective Remote Work Practices',
        summary: 'Investigation of best practices for productivity, communication, and well-being in remote work environments.'
      },
      {
        title: 'Artificial Intelligence: Current Capabilities and Limitations',
        summary: 'Overview of modern AI technologies, what they can and cannot do, and how they compare to human intelligence.'
      },
      {
        title: 'Sustainable Urban Development',
        summary: 'Analysis of approaches to creating environmentally friendly, socially equitable, and economically viable cities.'
      }
    ],
    colors: ['#4A00E0', '#8E2DE2'],
    imageUri: 'https://api.a0.dev/assets/image?text=library%20with%20books%20and%20digital%20screens&aspect=16:9&seed=123'
  };

  // Handle navigating to ResearchParametersScreen with this agent
  const handleUseAgent = () => {
    // Update theme to cosmic when using the agent
    if (themeMode !== 'cosmic') {
      setThemeMode('cosmic');
    }
    navigation.navigate('ResearchParametersScreen', { agent: agentData });
  };

  // This will be implemented later to fetch research examples
  const handleResearchClick = (research: { title: string; summary: string }) => {
    console.log(`Research clicked: ${research.title}`);
    // Future implementation will fetch 5 research examples
  };

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
          onPress={() => navigation.navigate('AgentListScreen')}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.7)', 'rgba(45, 52, 57, 0.5)']}
            style={styles.backButtonGradient}
          >
            <MaterialIcons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.headerPlaceholder} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Agent Banner */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 } as any}
          style={styles.bannerContainer}
        >
          <ImageBackground
            source={{ uri: agentData.imageUri }}
            style={styles.banner}
            imageStyle={styles.bannerImage}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.bannerGradient}
            >
              <Text style={styles.agentName}>{agentData.name}</Text>
              <View style={styles.specialtyContainer}>
                <FontAwesome name="search" size={16} color="#fff" />
                <Text style={styles.specialtyText}>{agentData.specialty}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </MotiView>
        
        {/* Description Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 } as any}
        >
          <GlassMorphicCard style={styles.section}>
            <Text style={styles.sectionTitle}>About This Agent</Text>
            <Text style={styles.descriptionText}>{agentData.description}</Text>
            
            {agentData.longDescription.split('\n\n').map((paragraph, index) => (
              <Text key={index} style={styles.paragraphText}>{paragraph}</Text>
            ))}
          </GlassMorphicCard>
        </MotiView>
        
        {/* Ideal For Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 } as any}
        >
          <GlassMorphicCard style={styles.section}>
            <Text style={styles.sectionTitle}>Ideal For</Text>
            {agentData.idealFor.map((item, index) => (
              <View key={index} style={styles.idealItem}>
                <MaterialIcons name="check-circle" size={18} color={agentData.colors[0]} />
                <Text style={styles.idealItemText}>{item}</Text>
              </View>
            ))}
          </GlassMorphicCard>
        </MotiView>
        
        {/* Example Research Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 300 } as any}
        >
          <GlassMorphicCard style={styles.section}>
            <Text style={styles.sectionTitle}>Example Research</Text>
            {agentData.exampleResearch.map((research, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.researchItem}
                onPress={() => handleResearchClick(research)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[`${agentData.colors[0]}20`, `${agentData.colors[1]}10`]}
                  style={styles.researchGradient}
                >
                  <View style={styles.researchContent}>
                    <Text style={styles.researchTitle}>{research.title}</Text>
                    <Text style={styles.researchSummary}>{research.summary}</Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={20} color={agentData.colors[0]} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </GlassMorphicCard>
        </MotiView>
        
        <View style={styles.spacer} />
      </ScrollView>
      
      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.useAgentButton}
          onPress={handleUseAgent}
        >
          <LinearGradient
            colors={agentData.colors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.useAgentGradient}
          >
            <Text style={styles.useAgentText}>Start Research</Text>
            <MaterialIcons name="arrow-forward" size={22} color="#fff" style={styles.buttonIcon} />
          </LinearGradient>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 8,
    borderRadius: 30, 
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  bannerContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  banner: {
    height: 200,
    justifyContent: 'flex-end',
  },
  bannerImage: {
    resizeMode: 'cover',
    borderRadius: 16,
  },
  bannerGradient: {
    padding: 20,
    paddingTop: 60,
  },
  agentName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  specialtyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
    marginBottom: 16,
  },
  paragraphText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
    marginBottom: 12,
  },
  idealItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  idealItemText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    flex: 1,
    marginLeft: 8,
  },
  researchItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  researchGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  researchContent: {
    flex: 1,
    marginRight: 12,
  },
  researchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 8,
  },
  researchSummary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  spacer: {
    height: 80,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(5, 10, 24, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 255, 218, 0.1)',
  },
  useAgentButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  useAgentGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  useAgentText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
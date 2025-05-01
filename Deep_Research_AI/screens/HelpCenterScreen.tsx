import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner-native';

// Define our cosmic theme palette
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

// FAQs data
const faqs = [
  {
    question: "What is Royal Research?",
    answer: "Royal Research is an AI-powered research assistant platform designed to help users with academic, business, health, and financial research. It uses advanced AI agents to search, analyze, and synthesize information from various sources."
  },
  {
    question: "How do I start a new research?",
    answer: "To start a new research, navigate to the home screen and select an appropriate research agent (General, Business, Health, or Financial). Then specify your research parameters and questions to begin the research process."
  },
  {
    question: "Is my research data secure?",
    answer: "Yes, Royal Research uses secure authentication and password protection. Your research data is stored in a secure database and is only accessible to you through your authenticated account."
  },
  {
    question: "How does the Find Study feature work?",
    answer: "The Find Study feature, currently in Beta, allows you to discover and participate in research studies. These studies are password-protected and require authentication to access. This feature helps connect researchers with participants in a secure environment."
  },
  {
    question: "How do I save my research results?",
    answer: "Research results are automatically saved to your account history. You can access past research from the History screen at any time. You also have the option to export or share research results from the Research Result screen."
  },
  {
    question: "Can I modify my profile information?",
    answer: "Yes, you can edit your profile information including your username, bio, and profile picture from the Profile screen. Simply tap on 'Edit Profile' to make changes."
  },
  {
    question: "What should I do if I encounter technical issues?",
    answer: "If you encounter technical issues, please contact our support team through the Contact section below. Provide detailed information about the issue you're experiencing for faster resolution."
  }
];

export default function HelpCenterScreen() {
  const navigation = useNavigation<any>();
  const { themeMode, setThemeMode } = useTheme();
  
  // Set theme to cosmic on this screen
  React.useEffect(() => {
    if (themeMode !== 'cosmic') {
      setThemeMode('cosmic');
    }
  }, []);

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
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.7)', 'rgba(45, 52, 57, 0.5)']}
            style={styles.backButtonGradient}
          >
            <MaterialIcons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 } as any}
        >
          <GlassMorphicCard style={styles.welcomeSection}>
            <View style={styles.welcomeIconContainer}>
              <LinearGradient
                colors={['#4A00E0', '#8E2DE2']}
                style={styles.welcomeIconGradient}
              >
                <MaterialIcons name="help-outline" size={36} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.welcomeTitle}>How can we help you?</Text>
            <Text style={styles.welcomeText}>
              Welcome to the Royal Research Help Center. Find answers to common questions and learn how to make the most of our research platform.
            </Text>
          </GlassMorphicCard>
        </MotiView>
        
        {/* Quick Links Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 100 } as any}
        >
          <GlassMorphicCard style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Links</Text>
            
            <View style={styles.quickLinksContainer}>
              <TouchableOpacity 
                style={styles.quickLinkCard}
                onPress={() => navigation.navigate('LegalInfoScreen', { section: 'privacy' })}
              >
                <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(100, 255, 218, 0.15)' }]}>
                  <MaterialIcons name="security" size={24} color={COSMIC_THEME.glacialTeal} />
                </View>
                <Text style={styles.quickLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickLinkCard}
                onPress={() => navigation.navigate('LegalInfoScreen', { section: 'terms' })}
              >
                <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(142, 45, 226, 0.15)' }]}>
                  <MaterialIcons name="gavel" size={24} color="#8E2DE2" />
                </View>
                <Text style={styles.quickLinkText}>Terms of Service</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickLinkCard}
                onPress={() => navigation.navigate('LegalInfoScreen', { section: 'contact' })}
              >
                <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(255, 111, 97, 0.15)' }]}>
                  <MaterialIcons name="email" size={24} color="#FF6F61" />
                </View>
                <Text style={styles.quickLinkText}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          </GlassMorphicCard>
        </MotiView>
        
        {/* Research Features Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 } as any}
        >
          <GlassMorphicCard style={styles.section}>
            <Text style={styles.sectionTitle}>Research Features</Text>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(100, 255, 218, 0.15)' }]}>
                <MaterialIcons name="psychology" size={24} color={COSMIC_THEME.glacialTeal} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI Research Agents</Text>
                <Text style={styles.featureDescription}>
                  Specialized AI agents for general, business, health, and financial research topics.
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(142, 45, 226, 0.15)' }]}>
                <MaterialIcons name="science" size={24} color="#8E2DE2" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Find Study (Beta)</Text>
                <Text style={styles.featureDescription}>
                  Discover and participate in research studies. Password-protected and authenticated for security.
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                <MaterialIcons name="history" size={24} color={COSMIC_THEME.burnishedGold} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Research History</Text>
                <Text style={styles.featureDescription}>
                  Access all your past research sessions and results from the history screen.
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 111, 97, 0.15)' }]}>
                <MaterialIcons name="dashboard" size={24} color="#FF6F61" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Research Dashboard</Text>
                <Text style={styles.featureDescription}>
                  Monitor ongoing research, track progress, and view results in real-time.
                </Text>
              </View>
            </View>
          </GlassMorphicCard>
        </MotiView>
        
        <View style={styles.spacer} />
      </ScrollView>
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
    marginBottom: 8,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  welcomeSection: {
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  welcomeIconContainer: {
    marginBottom: 16,
    borderRadius: 50,
    overflow: 'hidden',
  },
  welcomeIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 16,
  },
  quickLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickLinkCard: {
    width: '48%',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 17, 40, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  quickLinkIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 17, 40, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  spacer: {
    height: 20,
  },
}); 
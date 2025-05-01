import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { useTheme } from '../context/ThemeContext';

// Define cosmic theme palette for consistent styling
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
}> = ({ 
  children, 
  style, 
  intensity = 15
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[{ 
          overflow: 'hidden', 
          borderRadius: 16,
          shadowColor: COSMIC_THEME.glacialTeal,
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
      shadowColor: COSMIC_THEME.glacialTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    }, style]}>
      {children}
    </View>
  );
};

const LegalInfoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { section } = route.params as { section: 'privacy' | 'terms' | 'contact' };
  const { themeMode, setThemeMode } = useTheme();
  
  // Set theme to cosmic on this screen
  React.useEffect(() => {
    if (themeMode !== 'cosmic') {
      setThemeMode('cosmic');
    }
  }, []);

  const getTitle = () => {
    switch (section) {
      case 'privacy': return 'Privacy Policy';
      case 'terms': return 'Terms of Service';
      case 'contact': return 'Contact Us';
      default: return 'Legal Information';
    }
  };

  const getContent = () => {
    switch (section) {
      case 'privacy':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 } as any}
          >
            <Text style={styles.sectionHeader}>1. Introduction</Text>
            <Text style={styles.content}>
              Welcome to Royal Research, a beta research assistant application by LimitlessMid.ai. This Privacy Policy explains how we collect, use, protect, and share your personal information when you use our services.
            </Text>
            
            <Text style={styles.sectionHeader}>2. Information We Collect</Text>
            <Text style={styles.content}>
              • Account Information: When you create an account, we collect your email, username, and password.
              {'\n\n'}
              • Profile Information: Any additional information you provide in your profile such as bio or profile pictures.
              {'\n\n'}
              • Research Data: Topics, questions, and parameters you enter for research purposes.
              {'\n\n'}
              • Usage Information: How you interact with the app, including features used and time spent.
            </Text>
            
            <Text style={styles.sectionHeader}>3. How We Use Your Information</Text>
            <Text style={styles.content}>
              • To provide and improve our research services
              {'\n\n'}
              • To personalize your experience
              {'\n\n'}
              • To communicate with you about updates and features
              {'\n\n'}
              • To ensure security and prevent fraud
            </Text>
            
            <Text style={styles.sectionHeader}>4. Data Security</Text>
            <Text style={styles.content}>
              Royal Research implements password protection, authentication, and secure data storage practices. As a beta application, we continually enhance security measures to protect user data.
            </Text>
            
            <Text style={styles.sectionHeader}>5. Data Sharing</Text>
            <Text style={styles.content}>
              We do not sell your personal information. We may share anonymized, aggregated data for research purposes. We may share data with service providers who help us operate the application.
            </Text>
            
            <Text style={styles.sectionHeader}>6. Changes to This Policy</Text>
            <Text style={styles.content}>
              We may update this Privacy Policy as our service evolves. We will notify you of any significant changes through the app or via email.
            </Text>
            
            <Text style={styles.sectionHeader}>7. Contact Us</Text>
            <Text style={styles.content}>
              If you have questions about this Privacy Policy, please contact the LimitlessMid.ai team through the Contact section in the app.
            </Text>
            
            <Text style={styles.update}>Last Updated: April 2023</Text>
          </MotiView>
        );
      case 'terms':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 } as any}
          >
            <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
            <Text style={styles.content}>
              By accessing or using Royal Research, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
            </Text>
            
            <Text style={styles.sectionHeader}>2. Beta Status</Text>
            <Text style={styles.content}>
              Royal Research is currently in beta. This means:
              {'\n\n'}
              • Features and functionality may change without notice
              {'\n\n'}
              • The service may experience downtime or performance issues
              {'\n\n'}
              • Your feedback is valuable in improving our services
            </Text>
            
            <Text style={styles.sectionHeader}>3. Account Responsibilities</Text>
            <Text style={styles.content}>
              • You are responsible for maintaining the confidentiality of your password
              {'\n\n'}
              • You agree to accept responsibility for all activities that occur under your account
              {'\n\n'}
              • You must not share your account credentials with others
            </Text>
            
            <Text style={styles.sectionHeader}>4. Acceptable Use</Text>
            <Text style={styles.content}>
              You agree not to:
              {'\n\n'}
              • Use the service for any illegal purpose
              {'\n\n'}
              • Submit content that infringes on others' rights
              {'\n\n'}
              • Attempt to interfere with or disrupt the service
              {'\n\n'}
              • Use automated methods to access or use the service without permission
            </Text>
            
            <Text style={styles.sectionHeader}>5. Intellectual Property</Text>
            <Text style={styles.content}>
              The Royal Research application, its original content, features, and functionality are owned by LimitlessMid.ai and are protected by international copyright, trademark, and other intellectual property laws.
            </Text>
            
            <Text style={styles.sectionHeader}>6. Limitation of Liability</Text>
            <Text style={styles.content}>
              LimitlessMid.ai shall not be liable for any indirect, incidental, special, or consequential damages that result from the use of, or the inability to use, the service.
            </Text>
            
            <Text style={styles.sectionHeader}>7. Changes to Terms</Text>
            <Text style={styles.content}>
              We reserve the right to modify these terms at any time. We will notify users of significant changes through the app or via email.
            </Text>

            <Text style={styles.update}>Last Updated: April 2023</Text>
          </MotiView>
        );
      case 'contact':
        return (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 } as any}
          >
            <Text style={styles.content}>
              We'd love to hear from you! If you have any questions, feedback, or need assistance with Royal Research, please reach out to our team.
            </Text>
            
            <Text style={styles.sectionHeader}>LimitlessMid.ai Team</Text>
            
            <View style={styles.teamMember}>
              <LinearGradient
                colors={['#4A00E0', '#8E2DE2']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>UJ</Text>
              </LinearGradient>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>UJWAL</Text>
                <Text style={styles.memberEmail}>ujwaljeevan123@gmail.com</Text>
                <TouchableOpacity 
                  style={styles.socialLink}
                  onPress={() => Linking.openURL('https://www.instagram.com/ujwaljeevan')}
                >
                  <Text style={styles.socialLinkText}>@ujwaljeevan</Text>
                  <MaterialIcons name="launch" size={16} color={COSMIC_THEME.glacialTeal} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.teamMember}>
              <LinearGradient
                colors={['#4A00E0', '#8E2DE2']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>AD</Text>
              </LinearGradient>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>ADITHYA</Text>
                <Text style={styles.memberEmail}>adithyant982@gmail.com</Text>
                <TouchableOpacity 
                  style={styles.socialLink}
                  onPress={() => Linking.openURL('https://www.instagram.com/adhi__005')}
                >
                  <Text style={styles.socialLinkText}>@adhi__005</Text>
                  <MaterialIcons name="launch" size={16} color={COSMIC_THEME.glacialTeal} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.teamMember}>
              <LinearGradient
                colors={['#4A00E0', '#8E2DE2']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>PA</Text>
              </LinearGradient>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>PAWEL</Text>
                <TouchableOpacity 
                  style={styles.socialLink}
                  onPress={() => Linking.openURL('https://www.instagram.com/pawelone')}
                >
                  <Text style={styles.socialLinkText}>@pawelone</Text>
                  <MaterialIcons name="launch" size={16} color={COSMIC_THEME.glacialTeal} />
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.sectionHeader}>App Information</Text>
            <Text style={styles.content}>
              Royal Research
              {'\n'}
              Version: 1.0.0 (Beta)
              {'\n'}
              © 2023 LimitlessMid.ai. All rights reserved.
            </Text>
          </MotiView>
        );
      default:
        return <Text style={styles.content}>No content available for this section.</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[COSMIC_THEME.deeperNavy, COSMIC_THEME.midnightNavy]}
        style={StyleSheet.absoluteFillObject}
      />

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
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <GlassMorphicCard style={styles.card}>
          {getContent()}
        </GlassMorphicCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COSMIC_THEME.deeperNavy,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
  },
  headerPlaceholder: {
    width: 40,
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
    marginTop: 16,
    marginBottom: 8,
  },
  content: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 8,
  },
  update: {
    fontSize: 14,
    color: COSMIC_THEME.glacialTeal,
    marginTop: 20,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    padding: 12,
    backgroundColor: 'rgba(10, 17, 40, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    marginLeft: 16,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialLinkText: {
    fontSize: 14,
    color: COSMIC_THEME.glacialTeal,
    marginRight: 6,
  },
});

export default LegalInfoScreen; 
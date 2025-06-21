import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Linking,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { toast } from 'sonner-native';

export default function DevPasswordScreen() {
  const navigation = useNavigation();
  const { isDarkMode, theme } = useTheme();
  const [password, setPassword] = useState('');
  
  // Handle password check and navigation
  const handleSubmitPassword = () => {
    if (password === 'RB_19') {
      setPassword('');
      toast.success('Developer mode activated');
      // Navigate to the dev control screen
      navigation.navigate('DevControlScreen');
    } else {
      toast.error('Invalid developer password');
    }
  };
  
  // Open URLs for social profiles
  const openURL = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Error opening URL:', err);
      toast.error('Could not open the link');
    });
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Developer Access</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Logo Container */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.logoContainer}
        >
          <Text style={[styles.companyName, { color: theme.text }]}>limitlessmind.ai</Text>
        </MotiView>
        
        {/* Password Container - Now at the top */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={[styles.passwordContainer, { backgroundColor: theme.card }]}
        >
          <MaterialIcons name="lock" size={30} color={theme.accent} style={styles.lockIcon} />
          <Text style={[styles.passwordTitle, { color: theme.text }]}>Developer Access</Text>
          <Text style={[styles.passwordSubtitle, { color: theme.secondaryText }]}>
            Enter developer password to continue
          </Text>
          
          <TextInput
            style={[styles.passwordInput, { 
              backgroundColor: theme.inputBackground, 
              color: theme.text,
              borderColor: theme.border
            }]}
            placeholder="Enter developer password"
            placeholderTextColor={theme.secondaryText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitPassword}
          >
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>Access Developer Controls</Text>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
        
        {/* Developers Info - Now moved down */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
          style={[styles.devInfoContainer, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>DEVELOPERS</Text>
          
          <View style={[styles.devRow, { borderBottomColor: theme.border }]}>
            <View style={styles.devInfo}>
              <TouchableOpacity onPress={() => openURL('https://www.instagram.com/ujwaljeevan')}>
                <Text style={[styles.devName, { color: theme.text }]}>@Ujwal</Text>
              </TouchableOpacity>
              <Text style={[styles.devEmail, { color: theme.secondaryText }]}>
                ujwaljeevan123@gmail.com
              </Text>
            </View>
          </View>
          
          <View style={styles.devRow}>
            <View style={styles.devInfo}>
              <TouchableOpacity onPress={() => openURL('https://www.instagram.com/adhi__005')}>
                <Text style={[styles.devName, { color: theme.text }]}>@Adithya</Text>
              </TouchableOpacity>
              <Text style={[styles.devEmail, { color: theme.secondaryText }]}>
                adithyant982@gmail.com
              </Text>
            </View>
          </View>
        </MotiView>
        
        {/* Footer */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 600 }}
          style={styles.footer}
        >
          <Text style={[styles.footerText, { color: theme.secondaryText }]}>
            This area is restricted to development team only.
          </Text>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  devInfoContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  devRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  devInfo: {
    flexDirection: 'column',
  },
  devName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  devEmail: {
    fontSize: 14,
  },
  passwordContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  lockIcon: {
    marginBottom: 10,
  },
  passwordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  passwordSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
  },
  submitButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
}); 
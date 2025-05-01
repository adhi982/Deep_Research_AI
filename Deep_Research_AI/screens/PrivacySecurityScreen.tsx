import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { toast } from 'sonner-native';

export default function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  // State for toggles
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [saveSearchHistory, setSaveSearchHistory] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#2E3192', '#1BFFFF'] : ['#4A00E0', '#8E2DE2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <MaterialIcons name="security" size={24} color="#fff" />
          <Text style={styles.headerText}>Privacy & Security</Text>
        </View>

        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={[styles.section, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Security Settings
          </Text>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => navigation.navigate('ChangePasswordScreen')}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="lock" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Change Password
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.secondaryText} />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="fingerprint" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Biometric Login
              </Text>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={(value) => {
                setIsBiometricEnabled(value);
                toast.success(`Biometric login ${value ? 'enabled' : 'disabled'}`);
              }}
              trackColor={{ false: '#767577', true: '#6c63ff' }}
              thumbColor={isBiometricEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="security" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Two-Factor Authentication
              </Text>
            </View>
            <Switch
              value={isTwoFactorEnabled}
              onValueChange={(value) => {
                setIsTwoFactorEnabled(value);
                toast.success(`Two-factor authentication ${value ? 'enabled' : 'disabled'}`);
              }}
              trackColor={{ false: '#767577', true: '#6c63ff' }}
              thumbColor={isTwoFactorEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </MotiView>

        {/* Privacy Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 100 }}
          style={[styles.section, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Privacy Settings
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="visibility" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Profile Visibility
              </Text>
            </View>
            <Switch
              value={isProfilePublic}
              onValueChange={(value) => {
                setIsProfilePublic(value);
                toast.success(`Profile visibility set to ${value ? 'public' : 'private'}`);
              }}
              trackColor={{ false: '#767577', true: '#6c63ff' }}
              thumbColor={isProfilePublic ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="history" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Save Search History
              </Text>
            </View>
            <Switch
              value={saveSearchHistory}
              onValueChange={(value) => {
                setSaveSearchHistory(value);
                toast.success(`Search history ${value ? 'enabled' : 'disabled'}`);
              }}
              trackColor={{ false: '#767577', true: '#6c63ff' }}
              thumbColor={saveSearchHistory ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              toast.info('Account deletion process initiated');
              // Implement account deletion logic
            }}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="delete" 
                size={24} 
                color="#e74c3c" 
              />
              <Text style={[styles.deleteText]}>
                Delete Account
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.secondaryText} />
          </TouchableOpacity>
        </MotiView>

        {/* Data & Privacy Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={[styles.section, { backgroundColor: theme.card }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="article" size={24} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 10 }]}>
              Legal & Help
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              navigation.navigate('LegalInfoScreen', { section: 'privacy' });
            }}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="description" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Privacy Policy
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              navigation.navigate('LegalInfoScreen', { section: 'terms' });
            }}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="gavel" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Terms of Service
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              navigation.navigate('HelpCenterScreen');
            }}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="help-outline" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Help Center
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              navigation.navigate('LegalInfoScreen', { section: 'contact' });
            }}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="people" 
                size={24} 
                color={theme.text} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>
                Contact Our Team
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.secondaryText} />
          </TouchableOpacity>
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
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  deleteText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#e74c3c',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
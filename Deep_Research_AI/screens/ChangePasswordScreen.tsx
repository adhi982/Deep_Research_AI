import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { toast } from 'sonner-native';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password validation
  const isValidPassword = (password) => {
    // At least 8 characters
    if (password.length < 8) return false;
    
    // At least one uppercase, one lowercase, one number, one special character
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpper && hasLower && hasNumber && hasSpecial;
  };
  
  // Get validation error message
  const getPasswordError = () => {
    if (!newPassword) return '';
    if (newPassword.length < 8) return 'Password must be at least 8 characters';
    
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasUpper) return 'Password must include an uppercase letter';
    if (!hasLower) return 'Password must include a lowercase letter';
    if (!hasNumber) return 'Password must include a number';
    if (!hasSpecial) return 'Password must include a special character';
    
    return '';
  };
  
  // Handle password change
  const handleChangePassword = async () => {
    // Reset error
    setError('');
    
    // Validate fields
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    
    if (!isValidPassword(newPassword)) {
      setError(getPasswordError() || 'New password does not meet requirements');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }
    
    // Show loading indicator
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success notification
      toast.success('Password changed successfully');
      
      // Navigate back to profile screen
      navigation.goBack();
    } catch (error) {
      setError('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle forgot password
  const handleForgotPassword = () => {
    // Navigate to forgot password screen (to be implemented)
    // For now, just show an info toast
    toast.info('Forgot password functionality will be available soon');
  };

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
        
        <Text style={styles.headerTitle}>Change Password</Text>
        
        <View style={styles.rightPlaceholder} />
      </LinearGradient>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView 
          contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.background }]}
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
            style={[styles.formContainer, { backgroundColor: theme.card }]}
          >
            <MaterialIcons 
              name="lock" 
              size={40} 
              color={theme.accent} 
              style={styles.lockIcon}
            />
            
            <Text style={[styles.formTitle, { color: theme.text }]}>
              Update Your Password
            </Text>
            
            <Text style={[styles.formSubtitle, { color: theme.secondaryText }]}>
              Please enter your current password and choose a new secure password
            </Text>
            
            {/* Current Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Current Password
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  secureTextEntry={!currentPasswordVisible}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.secondaryText}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}
                >
                  <Ionicons
                    name={currentPasswordVisible ? 'eye-off' : 'eye'}
                    size={22}
                    color={theme.secondaryText}
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* New Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                New Password
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  secureTextEntry={!newPasswordVisible}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.secondaryText}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={() => setNewPasswordVisible(!newPasswordVisible)}
                >
                  <Ionicons
                    name={newPasswordVisible ? 'eye-off' : 'eye'}
                    size={22}
                    color={theme.secondaryText}
                  />
                </TouchableOpacity>
              </View>
              
              {/* Password requirements */}
              {newPassword ? (
                <View style={styles.passwordRequirements}>
                  <Text style={[styles.requirementText, { color: theme.secondaryText }]}>
                    Password must include:
                  </Text>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={newPassword.length >= 8 ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={newPassword.length >= 8 ? '#4bb543' : '#e74c3c'}
                      style={styles.requirementIcon}
                    />
                    <Text style={[
                      styles.requirementItemText,
                      { color: newPassword.length >= 8 ? '#4bb543' : '#e74c3c' }
                    ]}>
                      At least 8 characters
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={/[A-Z]/.test(newPassword) ? '#4bb543' : '#e74c3c'}
                      style={styles.requirementIcon}
                    />
                    <Text style={[
                      styles.requirementItemText,
                      { color: /[A-Z]/.test(newPassword) ? '#4bb543' : '#e74c3c' }
                    ]}>
                      At least one uppercase letter
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[a-z]/.test(newPassword) ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={/[a-z]/.test(newPassword) ? '#4bb543' : '#e74c3c'}
                      style={styles.requirementIcon}
                    />
                    <Text style={[
                      styles.requirementItemText,
                      { color: /[a-z]/.test(newPassword) ? '#4bb543' : '#e74c3c' }
                    ]}>
                      At least one lowercase letter
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={/[0-9]/.test(newPassword) ? '#4bb543' : '#e74c3c'}
                      style={styles.requirementIcon}
                    />
                    <Text style={[
                      styles.requirementItemText,
                      { color: /[0-9]/.test(newPassword) ? '#4bb543' : '#e74c3c' }
                    ]}>
                      At least one number
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#4bb543' : '#e74c3c'}
                      style={styles.requirementIcon}
                    />
                    <Text style={[
                      styles.requirementItemText,
                      { color: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#4bb543' : '#e74c3c' }
                    ]}>
                      At least one special character
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            
            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Confirm New Password
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  secureTextEntry={!confirmPasswordVisible}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.secondaryText}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                >
                  <Ionicons
                    name={confirmPasswordVisible ? 'eye-off' : 'eye'}
                    size={22}
                    color={theme.secondaryText}
                  />
                </TouchableOpacity>
              </View>
              
              {/* Password match indicator */}
              {confirmPassword && (
                <View style={styles.matchIndicator}>
                  <Ionicons
                    name={confirmPassword === newPassword ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={confirmPassword === newPassword ? '#4bb543' : '#e74c3c'}
                    style={styles.matchIcon}
                  />
                  <Text style={[
                    styles.matchText,
                    { color: confirmPassword === newPassword ? '#4bb543' : '#e74c3c' }
                  ]}>
                    {confirmPassword === newPassword 
                      ? 'Passwords match' 
                      : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={handleForgotPassword}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>
                Forgot your password?
              </Text>
            </TouchableOpacity>
            
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.cancelButtonText, { color: theme.secondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!currentPassword || !newPassword || !confirmPassword) && styles.saveButtonDisabled
                ]}
                onPress={handleChangePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword || isLoading}
              >
                <LinearGradient
                  colors={isDarkMode ? ['#2E3192', '#1BFFFF'] : ['#4A00E0', '#8E2DE2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  rightPlaceholder: {
    width: 40,
    height: 40,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  lockIcon: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  visibilityToggle: {
    padding: 8,
  },
  passwordRequirements: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  requirementText: {
    fontSize: 12,
    marginBottom: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  requirementIcon: {
    marginRight: 4,
  },
  requirementItemText: {
    fontSize: 12,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  matchIcon: {
    marginRight: 4,
  },
  matchText: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginLeft: 8,
  },
  forgotPasswordLink: {
    marginBottom: 24,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
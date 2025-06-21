import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import * as Haptics from 'expo-haptics';
import { toast } from '../utils/toast';
import { useUser } from '../context/UserContext';

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const { setUserId } = useUser();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    const trimmedEmail = email.toLowerCase().trim();
    
    try {
      setLoading(true);

      // First check if the user exists in the database
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('email', trimmedEmail)
        .single();

      if (!existingUser) {
        toast.error('Email not found. Please sign up first.');
        setLoading(false);
        return;
      }

      // Try to get the user's session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session) {
        // User is already logged in, just navigate
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return;
      }

      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (error) {
        console.error('Login error:', error);
        toast.error('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      if (!data?.user) {
        toast.error('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Check if profile exists and update last login
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profileData) {
        // Create profile if it doesn't exist
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: trimmedEmail,
              username: existingUser.username || trimmedEmail.split('@')[0],
              avatar_url: null,
              bio: null,
              full_name: existingUser.full_name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            }
          ]);

        if (createProfileError) {
          console.error('Profile creation error:', createProfileError);
          await supabase.auth.signOut();
          toast.error('Error creating user profile. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        // Update last login time
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('Error updating last login:', updateError);
          // Don't block login if update fails
        }
      }

      // Store the authenticated user ID in the global context
      await setUserId(data.user.id);
      console.log(`Login: Stored user ID ${data.user.id} in global context`);

      // Success! Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      console.error('Login process error:', error);
      toast.error('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetEmail.trim() === '') {
      toast.error('Please enter your email address.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: 'yourapp://reset-password',
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password reset link has been sent to your email.');
      setModalVisible(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('Failed to send reset password link. Please try again.');
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !signUpEmail || !signUpPassword || !confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (signUpPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSigningUp(true);
    const trimmedEmail = signUpEmail.toLowerCase().trim();
    
    try {
      // First check if the user exists in auth
      const { data: { user: existingAuthUser }, error: authCheckError } = await supabase.auth.getUser();
      
      if (existingAuthUser) {
        await supabase.auth.signOut();
      }

      // Check if user exists in database
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', trimmedEmail)
        .single();

      if (existingUser) {
        toast.error('Email already registered');
        setIsSigningUp(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: signUpPassword,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        toast.error(authError.message);
        setIsSigningUp(false);
        return;
      }

      if (!authData?.user) {
        toast.error('Failed to create account');
        setIsSigningUp(false);
        return;
      }

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: trimmedEmail,
            username: trimmedEmail.split('@')[0],
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (userError) {
        console.error('User creation error:', userError);
        await supabase.auth.signOut();
        toast.error('Failed to create user record');
        setIsSigningUp(false);
        return;
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: trimmedEmail,
            username: trimmedEmail.split('@')[0],
            avatar_url: null,
            bio: null,
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        await supabase.auth.signOut();
        await supabase
          .from('users')
          .delete()
          .eq('id', authData.user.id);
        toast.error('Failed to create profile');
        setIsSigningUp(false);
        return;
      }

      // Reset form
      setShowSignUpModal(false);
      setFullName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setConfirmPassword('');
      
      // Show success message and navigate to Home
      toast.success('Account created successfully!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSigningUp(false);
    }
  };
  
  const isValidSignUp = () => {
    // Implement your validation logic here
    return true; // Placeholder return, actual implementation needed
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.title}>Welcome Back</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
                <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="Enter your email"
          placeholderTextColor="#666"
                  value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError('');
          }}
                  keyboardType="email-address"
                  autoCapitalize="none"
          editable={!loading}
                />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
                <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Your password"
          placeholderTextColor="#666"
          secureTextEntry
                  value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError('');
          }}
          editable={!loading}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
            </View>
            
              <TouchableOpacity
        style={[styles.loginButton, loading && styles.disabledButton]} 
                onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.orText}>OR</Text>

      <TouchableOpacity style={styles.socialButton}>
        <Ionicons name="logo-google" size={20} color="#fff" />
        <Text style={styles.socialButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Don't have an account?{' '}
        <Text
          style={styles.signupText}
          onPress={() => navigation.navigate('Signup')}
        >
          Sign Up
        </Text>
      </Text>

      {/* Skip Login Button */}
            <TouchableOpacity 
        style={styles.skipButton}
        onPress={() => navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })}
      >
        <Text style={styles.skipButtonText}>Skip Login</Text>
            </TouchableOpacity>

      {/* Forgot Password Modal */}
            <Modal
        animationType="slide"
              transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address to receive a reset password link.
                      </Text>
                          <TextInput
              style={styles.modalInput}
                            placeholder="Enter your email"
              placeholderTextColor="#666"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setModalVisible(false);
                  setResetEmail('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSend}
                onPress={handleForgotPassword}
              >
                <Text style={styles.modalButtonText}>Send</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                  </View>
              </Modal>
            </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
    width: '80%',
    maxWidth: 400,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
  loginButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    width: '80%',
    maxWidth: 400,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#4caf50',
    fontSize: 14,
  },
  orText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    width: '80%',
    maxWidth: 400,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  modalButtonSend: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
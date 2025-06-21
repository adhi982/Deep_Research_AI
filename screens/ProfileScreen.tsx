import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  Switch,
  ScrollView,
  TextInput,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons, FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { toast } from 'sonner-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { 
  fetchUserProfileWithCache, 
  fetchUserEmailWithCache, 
  updateUserProfile, 
  clearProfileCache,
  logoutAndClearCache,
  ProfileData
} from '../utils/profileService';
import { useUser } from '../context/UserContext';

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

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { themeMode, theme, toggleTheme, setThemeMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    email: '',
    bio: '',
    avatarUrl: null
  });
  
  // Editable values state
  const [username, setUsername] = useState(profileData.username);
  const [bio, setBio] = useState(profileData.bio);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Profile image
  const [profileImage, setProfileImage] = useState("https://api.a0.dev/assets/image?text=minimal%20profile%20avatar%20professional&aspect=1:1&seed=123");
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Add state for email loading
  const [emailLoading, setEmailLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Add refreshing state
  const [refreshing, setRefreshing] = useState(false);
  
  const { setUserId: setUserIdGlobal } = useUser();

  useEffect(() => {
    fetchUserProfile();
    fetchUserEmail();
    
    // Set theme to cosmic on profile screen
    if (themeMode !== 'cosmic') {
      setThemeMode('cosmic');
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Use cached profile data
      const profile = await fetchUserProfileWithCache();
      
      if (!profile) {
        console.log('No profile found');
        return;
      }

      // Extract user ID from profile data
      setUserId(profile.id || null);

      // Update local state with profile data
      setProfileData(profile);
      setUsername(profile.username);
      setBio(profile.bio);
      
      // Set profile image if available
      if (profile.avatarUrl) {
        setProfileImage(profile.avatarUrl);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEmail = async () => {
    try {
      setEmailLoading(true);
      
      // Use cached email
      const email = await fetchUserEmailWithCache();
      setUserEmail(email);
    } catch (error: any) {
      console.error('Error fetching email:', error.message);
      toast.error('Failed to load email');
    } finally {
      setEmailLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permission required to access media library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      toast.error('Failed to pick image');
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!userId) {
      toast.error('No user session found');
      return;
    }

    setLoading(true);
    try {
      const fileExt = imageUri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL using the profile service
      const success = await updateUserProfile({
        avatarUrl: publicUrl
      });

      if (!success) {
        throw new Error('Failed to update profile with new avatar');
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        avatarUrl: publicUrl
      }));
      
      setProfileImage(publicUrl);
      
      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      toast.error('No user session found');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    setLoading(true);
    try {
      // Update profile using the profile service
      const success = await updateUserProfile({
        username,
        bio
      });

      if (!success) {
        throw new Error('Failed to update profile');
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        username,
        bio
      }));
      
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to Change Password Screen
  const navigateToChangePassword = () => {
    navigation.navigate('ChangePasswordScreen');
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      toast.info('Logging out...');
      
      // Use the profileService to handle logout and cache clearing
      const success = await logoutAndClearCache();
      
      if (!success) {
        throw new Error('Failed to sign out');
      }
      
      // Also clear the user ID from context if needed
      if (setUserIdGlobal) {
        setUserIdGlobal(null);
      }
      
      toast.success('Signed out successfully');
      
      // Navigate to LandingScreen instead of Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Animated header opacity
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Handle edit profile animation
  const handleEditProfilePress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsEditing(true);
    });
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Clear profile cache to force fresh data
      if (userId) {
        await clearProfileCache(userId);
      }
      
      // Fetch fresh profile data and email
      await Promise.all([
        fetchUserProfile(),
        fetchUserEmail()
      ]);
      
      toast.success('Profile refreshed');
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast.error('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  if (emailLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COSMIC_THEME.glacialTeal} />
      </View>
    );
  }

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
          <MaterialIcons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color={COSMIC_THEME.paleMoonlight} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COSMIC_THEME.glacialTeal}
            colors={[COSMIC_THEME.glacialTeal]}
          />
        }
      >
        {/* Profile Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
        >
          <GlassMorphicCard style={styles.profileCard}>
            {isEditing ? (
              // Edit mode profile
              <View style={styles.editProfileContent}>
                <TouchableOpacity 
                  style={styles.avatarContainer} 
                  onPress={pickImage}
                >
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.avatar} 
                  />
                  <View style={styles.editAvatarOverlay}>
                    <MaterialIcons name="photo-camera" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
                
                <View style={styles.editForm}>
                  <Text style={styles.editLabel}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  
                  <Text style={styles.editLabel}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    multiline
                  />
                  
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  
                  <View style={styles.editButtons}>
                    <TouchableOpacity 
                      style={[styles.editButton, styles.cancelButton]}
                      onPress={() => {
                        setUsername(profileData.username);
                        setBio(profileData.bio);
                        setIsEditing(false);
                        setError('');
                      }}
                    >
                      <Text style={styles.editButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.editButton, styles.saveButton]}
                      onPress={handleSaveProfile}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.editButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // View mode profile
              <View style={styles.profileContent}>
                <View style={styles.profileHeader}>
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.avatar} 
                  />
                  
                  <View style={styles.profileDetails}>
                    <Text style={styles.username}>{profileData.username || 'Guest User'}</Text>
                    
                    {emailLoading ? (
                      <ActivityIndicator size="small" color={COSMIC_THEME.glacialTeal} />
                    ) : (
                      <Text style={styles.email}>{userEmail || 'No email available'}</Text>
                    )}
                  </View>
                </View>
                
                {profileData.bio ? (
                  <Text style={styles.bio}>{profileData.bio}</Text>
                ) : (
                  <Text style={styles.emptyBio}>No bio added yet</Text>
                )}
                
                <TouchableOpacity 
                  style={styles.editProfileButton}
                  onPress={handleEditProfilePress}
                >
                  <LinearGradient
                    colors={['#4A00E0', '#8E2DE2']}
                    style={styles.editProfileGradient}
                  >
                    <MaterialIcons name="edit" size={20} color="#fff" />
                    <Text style={styles.editProfileText}>Edit Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </GlassMorphicCard>
        </MotiView>
        
        {/* Preferences Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 100 }}
        >
          <GlassMorphicCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="settings" size={22} color={COSMIC_THEME.glacialTeal} />
              <Text style={styles.sectionTitle}>Preferences</Text>
            </View>
            
            <View style={styles.preferencesList}>
              <TouchableOpacity 
                style={styles.preferenceItem}
                onPress={() => navigation.navigate('ChangePasswordScreen')}
              >
                <View style={styles.preferenceContent}>
                  <MaterialIcons 
                    name="lock" 
                    size={24} 
                    color={COSMIC_THEME.glacialTeal} 
                  />
                  <Text style={styles.preferenceText}>
                    Change Password
                  </Text>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={24} 
                  color="rgba(255, 255, 255, 0.5)" 
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.preferenceItem}
                onPress={() => navigation.navigate('HelpCenterScreen')}
              >
                <View style={styles.preferenceContent}>
                  <MaterialIcons 
                    name="help-outline" 
                    size={24} 
                    color={COSMIC_THEME.glacialTeal} 
                  />
                  <Text style={styles.preferenceText}>
                    Help Center
                  </Text>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={24} 
                  color="rgba(255, 255, 255, 0.5)" 
                />
              </TouchableOpacity>
            </View>
          </GlassMorphicCard>
        </MotiView>
        
        {/* Developer Options */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
        >
          <TouchableOpacity 
            style={styles.devButton}
            onPress={() => navigation.navigate('DevPasswordScreen')}
          >
            <MaterialIcons name="code" size={22} color={COSMIC_THEME.glacialTeal} />
            <Text style={styles.devButtonText}>Developer Options</Text>
          </TouchableOpacity>
        </MotiView>
        
        {/* Version Info */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 300 }}
          style={styles.versionContainer}
        >
          <View style={styles.versionContent}>
            <MaterialCommunityIcons name="flask-outline" size={18} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.versionText}>
              Version 1.0.0 (Beta)
            </Text>
          </View>
        </MotiView>
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
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
  },
  logoutButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 20,
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: COSMIC_THEME.glacialTeal,
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bio: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emptyBio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  editProfileButton: {
    overflow: 'hidden',
    borderRadius: 20,
    alignSelf: 'center',
  },
  editProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editProfileText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Edit mode styles
  editProfileContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COSMIC_THEME.glacialTeal,
  },
  editForm: {
    width: '100%',
  },
  editLabel: {
    fontSize: 14,
    color: COSMIC_THEME.glacialTeal,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(10, 17, 40, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: 'rgba(100, 255, 218, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    marginLeft: 8,
  },
  editButtonText: {
    color: COSMIC_THEME.paleMoonlight,
    fontWeight: '600',
  },
  // Preferences section
  section: {
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
    marginLeft: 8,
  },
  preferencesList: {
    backgroundColor: 'rgba(10, 17, 40, 0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceText: {
    fontSize: 16,
    color: COSMIC_THEME.paleMoonlight,
    marginLeft: 16,
  },
  // Dev button
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 17, 40, 0.6)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
    marginBottom: 16,
  },
  devButtonText: {
    fontSize: 16,
    color: COSMIC_THEME.paleMoonlight,
    marginLeft: 12,
  },
  // Version info
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COSMIC_THEME.deeperNavy,
  },
});
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types
interface UserContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  isAuthenticated: boolean;
  getUserProfile: () => Promise<any>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Create storage keys
const USER_ID_STORAGE_KEY = 'research_app_user_id';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserIdState] = useState<string | null>(null);

  // Set userId and also store in AsyncStorage for persistence
  const setUserId = async (id: string | null) => {
    setUserIdState(id);
    if (id) {
      await AsyncStorage.setItem(USER_ID_STORAGE_KEY, id);
      console.log(`UserContext: UserId ${id} stored in AsyncStorage`);
    } else {
      await AsyncStorage.removeItem(USER_ID_STORAGE_KEY);
      console.log('UserContext: UserId removed from AsyncStorage');
    }
  };

  // Load userId from AsyncStorage on app start
  useEffect(() => {
    const loadUserId = async () => {
      try {
        // Try to load from AsyncStorage first
        const storedId = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);
        
        if (storedId) {
          console.log(`UserContext: Found stored userId: ${storedId}`);
          setUserIdState(storedId);
        } else {
          console.log('UserContext: No stored userId found');
          
          // Check if there's an authenticated session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user?.id) {
            console.log(`UserContext: Found authenticated userId: ${session.user.id}`);
            // Store the user ID
            await setUserId(session.user.id);
          }
        }
      } catch (error) {
        console.error('UserContext: Error loading userId:', error);
      }
    };
    
    loadUserId();
  }, []);

  // Get user profile information
  const getUserProfile = async () => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('UserContext: Error fetching user profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('UserContext: Unexpected error fetching user profile:', error);
      return null;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      await setUserId(null);
    } catch (error) {
      console.error('UserContext: Error logging out:', error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        userId,
        setUserId,
        isAuthenticated: !!userId,
        getUserProfile,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 
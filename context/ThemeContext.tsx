import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// Theme type definition
export type ThemeType = {
  background: string;
  card: string;
  text: string;
  secondaryText: string;
  accent: string;
  border: string;
  statusBar: 'light' | 'dark';
  inputBackground: string;
  gradientStart: string;
  gradientEnd: string;
  gradient: string[];
};

// Theme context type definition
type ThemeContextType = {
  isDarkMode: boolean;
  theme: ThemeType;
  toggleTheme: () => void;
  isLoading: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

// Define theme colors and styles
export const lightTheme: ThemeType = {
  background: '#f8f9fa',
  card: 'white',
  text: '#333333',
  secondaryText: '#666666',
  accent: '#6c63ff',
  border: '#eee',
  statusBar: 'dark',
  inputBackground: '#F1F3F4',
  gradientStart: '#4A00E0',
  gradientEnd: '#8E2DE2',
  gradient: ['#4A00E0', '#8E2DE2'],
};

export const darkTheme: ThemeType = {
  background: '#0F172A', // Dark navy-inspired background
  card: '#1E293B', // Slightly lighter navy for cards
  text: '#E5E7EB', // Light gray for text
  secondaryText: '#CBD5E1', // Lighter gray for secondary text
  accent: '#8B5CF6', // Vibrant purple accent for dark mode
  border: '#334155', // Subtle border color
  statusBar: 'light',
  inputBackground: '#293548', // Slightly lighter than card for inputs
  gradientStart: '#2E3192',
  gradientEnd: '#1BFFFF',
  gradient: ['#2E3192', '#1BFFFF'],
};

export const cosmicTheme: ThemeType = {
  background: '#050A18', // Deep space background
  card: 'rgba(45, 52, 57, 0.45)', // Translucent card for glass effect
  text: '#E0E0E0', // Pale moonlight for text
  secondaryText: 'rgba(255, 255, 255, 0.7)', // Slightly dimmed text
  accent: 'rgba(100, 255, 218, 0.7)', // Glacial teal accent
  border: 'rgba(100, 255, 218, 0.15)', // Subtle glowing border
  statusBar: 'light',
  inputBackground: 'rgba(10, 17, 40, 0.6)', // Deep space input background
  gradientStart: '#0A1128',
  gradientEnd: '#050A18',
  gradient: ['#0A1128', '#050A18'],
};

// Type for theme mode
type ThemeMode = 'light' | 'dark' | 'cosmic';

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  theme: lightTheme,
  toggleTheme: () => {},
  isLoading: true,
  themeMode: 'light',
  setThemeMode: () => {}
});

// Provider component that wraps the app
export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  
  // Determine the active theme based on themeMode state
  const theme = themeMode === 'cosmic' 
    ? cosmicTheme 
    : themeMode === 'dark' 
      ? darkTheme 
      : lightTheme;
  
  // Load saved theme preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('appTheme');
        
        if (storedTheme !== null) {
          // Use stored preference if available
          if (storedTheme === 'cosmic') {
            setThemeModeState('cosmic');
            setIsDarkMode(true);
          } else if (storedTheme === 'dark') {
            setThemeModeState('dark');
            setIsDarkMode(true);
          } else {
            setThemeModeState('light');
            setIsDarkMode(false);
          }
        } else {
          // Otherwise use device preference
          const deviceTheme = Appearance.getColorScheme();
          setIsDarkMode(deviceTheme === 'dark');
          setThemeModeState(deviceTheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        // Default to light theme if there's an error
        setIsDarkMode(false);
        setThemeModeState('light');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTheme();
    
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only apply system changes if user hasn't set a preference
      AsyncStorage.getItem('appTheme').then(storedTheme => {
        if (storedTheme === null) {
          setIsDarkMode(colorScheme === 'dark');
          setThemeModeState(colorScheme === 'dark' ? 'dark' : 'light');
        }
      });
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Toggle between light and dark theme
  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      const newThemeMode = newMode ? 'dark' : 'light';
      setThemeModeState(newThemeMode);
      await AsyncStorage.setItem('appTheme', newThemeMode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // Set a specific theme mode
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      setIsDarkMode(mode !== 'light');
      await AsyncStorage.setItem('appTheme', mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };
  
  // Provide theme context to children components
  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      theme, 
      toggleTheme, 
      isLoading,
      themeMode,
      setThemeMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useTheme = () => useContext(ThemeContext);
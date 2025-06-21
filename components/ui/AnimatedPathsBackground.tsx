import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

// Simple background component without animations for now to fix the bundling issues
const AnimatedPathsBackground = ({ children }) => {
  const { isDarkMode } = useTheme();
  const backgroundColor = isDarkMode ? '#0f172a' : '#f8fafc';
  
  return (
    <View style={[styles.backgroundContainer, { backgroundColor }]}>
      {/* Semi-transparent overlay for better content visibility */}
      <View style={[
        styles.overlay, 
        { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.25)' }
      ]} />
      
      {/* Render the child components above the background */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
  },
});

export default AnimatedPathsBackground;
import React, { useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  style?: any;
}

export const ThemeToggle = ({ style }: ThemeToggleProps) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const translateX = useRef(new Animated.Value(isDarkMode ? 0 : 28)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lightOpacity = useRef(new Animated.Value(isDarkMode ? 0.5 : 1)).current;
  const darkOpacity = useRef(new Animated.Value(isDarkMode ? 1 : 0.5)).current;

  useEffect(() => {
    // Animate toggle position
    Animated.spring(translateX, {
      toValue: isDarkMode ? 0 : 28,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Animate rotation
    Animated.timing(rotateAnim, {
      toValue: isDarkMode ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate scale button press effect
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();

    // Animate icon opacity
    Animated.parallel([
      Animated.timing(lightOpacity, {
        toValue: isDarkMode ? 0.5 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(darkOpacity, {
        toValue: isDarkMode ? 1 : 0.5,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [isDarkMode]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={toggleTheme}
      style={[styles.container, style]}
    >
      <Animated.View 
        style={[
          styles.toggleContainer, 
          { 
            backgroundColor: isDarkMode ? '#1E293B' : '#fff',
            borderColor: isDarkMode ? '#334155' : '#e5e7eb',
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        <View style={styles.iconContainer}>
          {/* Moon Icon */}
          <Animated.View 
            style={[
              styles.iconWrapper, 
              { 
                opacity: darkOpacity,
                transform: [{ scale: darkOpacity }]
              }
            ]}
          >
            <Ionicons name="moon" size={16} color={isDarkMode ? "#fff" : "#1E293B"} />
          </Animated.View>

          {/* Sun Icon */}
          <Animated.View 
            style={[
              styles.iconWrapper, 
              { 
                opacity: lightOpacity,
                transform: [{ scale: lightOpacity }]
              }
            ]}
          >
            <Ionicons name="sunny" size={16} color={isDarkMode ? "#9ca3af" : "#FF9800"} />
          </Animated.View>
        </View>

        {/* Toggle Knob */}
        <Animated.View 
          style={[
            styles.knob, 
            { 
              backgroundColor: isDarkMode ? '#6c63ff' : '#f3f4f6',
              transform: [
                { translateX }, 
                { rotate }
              ] 
            }
          ]}
        >
          {isDarkMode ? (
            <Ionicons name="moon" size={14} color="#fff" />
          ) : (
            <Ionicons name="sunny" size={14} color="#FF9800" />
          )}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContainer: {
    width: 60,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    position: 'absolute',
  },
  iconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  }
});
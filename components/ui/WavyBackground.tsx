import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';  interface WavyBackgroundProps {
    children?: React.ReactNode;
    colors?: string[];
    speed?: 'slow' | 'fast';
    waveOpacity?: number;
    style?: any;
    verticalOffset?: number;
  }

export const WavyBackground: React.FC<WavyBackgroundProps> = ({
  children,
  colors = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee'],
  speed = 'fast',
  waveOpacity = 0.5,
  style,
  verticalOffset = 0
}) => {
  const { width, height } = Dimensions.get('window');
  const waveCount = 5; // Number of wave animations
  
  // Create animated values for each wave
  const wavePositions = useRef(
    Array.from({ length: waveCount }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Animation duration based on speed
    const duration = speed === 'fast' ? 10000 : 18000;
    
    // Create animations for each wave
    const animations = wavePositions.map((anim, index) => {
      // Stagger the start position slightly for each wave
      anim.setValue(-0.2 * index);
      
      return Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: duration + (index * 1000), // Slightly different speed for each wave
          useNativeDriver: true,
        })
      );
    });
    
    // Start all animations
    animations.forEach(anim => anim.start());
    
    return () => {
      // Stop animations on unmount
      animations.forEach(anim => anim.stop());
    };
  }, [speed]);

  return (
    <View style={[styles.container, style]}>
      {/* Render each wave */}
      {wavePositions.map((anim, index) => {
        const color = colors[index % colors.length];
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.wave,
              {
                backgroundColor: color,
                opacity: waveOpacity,
                height: 60 + (index * 20), // Different height for each wave          top: 60 + (index * 10) + verticalOffset, // Adjusted vertical position with offset
                transform: [
                  {
                    translateX: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-width, 0],
                    }),
                  },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                      outputRange: [0, 10, -5, 10, -5, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
      
      {/* Content overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Children content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80, // Default height, will be overridden
    borderRadius: 40, // Rounded wave shape
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
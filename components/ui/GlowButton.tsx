import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlowButtonProps {
  onPress?: () => void;
  title: string;
  style?: any;
}

export const GlowButton = ({ 
  onPress, 
  title, 
  style 
}: GlowButtonProps) => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const shadowPulseAnim = useRef(new Animated.Value(0.9)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create continuous pulse animation for the circular glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Create continuous pulse animation for the rectangular shadow
    Animated.loop(
      Animated.sequence([
        Animated.timing(shadowPulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shadowPulseAnim, {
          toValue: 0.9,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.outerContainer, style]}>
      {/* Rectangular shadow effect */}
      <Animated.View 
        style={[
          styles.rectangularShadow,
          {
            opacity: shadowPulseAnim,
            transform: [{ scale: shadowPulseAnim }]
          }
        ]}
      />
      
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.container}
      >
        {/* Circular glow effect */}
        <Animated.View 
          style={[
            styles.circularGlowEffect,
            {
              opacity: pulseAnim,
              transform: [{ scale: pulseAnim }]
            }
          ]}
        />
        
        {/* Button Content */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#192f6a', '#0f1b42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>{title}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  outerContainer: {
    width: width * 0.8,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rectangularShadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#4e7bff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circularGlowEffect: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#3b5fe0',
    shadowColor: '#6495ed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#718fff',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
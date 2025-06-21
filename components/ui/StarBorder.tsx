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

interface StarBorderProps {
  onPress?: () => void;
  title: string;
  color?: string;
  animationSpeed?: number;
  style?: any;
}

export const StarBorder = ({ 
  onPress, 
  title, 
  color = '#FFD700', // Changed to gold/yellow 
  animationSpeed = 2000,
  style 
}: StarBorderProps) => {
  const topStarsAnim = useRef(new Animated.Value(0)).current;
  const bottomStarsAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animate stars continuously
    const animateStars = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(topStarsAnim, {
            toValue: 1,
            duration: animationSpeed,
            useNativeDriver: true,
          }),
          Animated.timing(topStarsAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bottomStarsAnim, {
            toValue: 1,
            duration: animationSpeed,
            useNativeDriver: true,
          }),
          Animated.timing(bottomStarsAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    };

    animateStars();
  }, [animationSpeed]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, style]}
    >
      {/* Top stars animation */}
      <Animated.View
        style={[
          styles.starsContainer,
          styles.topStars,
          {
            transform: [
              {
                translateX: topStarsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-250, 100]
                })
              }
            ]
          }
        ]}
      >
        {Array(15).fill(0).map((_, i) => (
          <View 
            key={`top-star-${i}`} 
            style={[
              styles.star, 
              { 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                backgroundColor: color,
                opacity: Math.random() * 0.5 + 0.2
              }
            ]} 
          />
        ))}
      </Animated.View>

      {/* Bottom stars animation */}
      <Animated.View
        style={[
          styles.starsContainer,
          styles.bottomStars,
          {
            transform: [
              {
                translateX: bottomStarsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [250, -100]
                })
              }
            ]
          }
        ]}
      >
        {Array(15).fill(0).map((_, i) => (
          <View 
            key={`bottom-star-${i}`} 
            style={[
              styles.star, 
              { 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                backgroundColor: color,
                opacity: Math.random() * 0.5 + 0.2
              }
            ]} 
          />
        ))}
      </Animated.View>

      {/* Button content */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [{ scale: buttonScale }],
            opacity: buttonOpacity
          }
        ]}
      >        <LinearGradient
          colors={['#1e2c57', '#0f1741', '#050d36']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width * 0.8,
    height: 60,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 20,
  },
  starsContainer: {
    position: 'absolute',
    width: '300%',
    height: '50%',
  },
  topStars: {
    top: -5,
  },
  bottomStars: {
    bottom: -5,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },  buttonContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: '#4e7bff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  }
});
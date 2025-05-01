import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const FloatingPathsBackground = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [paths, setPaths] = useState([]);
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height
  });

  // Colors for glowing paths - enhanced brightness for better visibility
  const glowColors = [
    { base: '#ffffff', glow: 'rgba(255, 255, 255, 0.9)' }, // White
    { base: '#ffd700', glow: 'rgba(255, 215, 0, 0.9)' },   // Gold/Yellow
    { base: '#4e7bff', glow: 'rgba(78, 123, 255, 0.9)' },  // Blue
    { base: '#ff61d8', glow: 'rgba(255, 97, 216, 0.9)' },  // Pink
    { base: '#50e3c2', glow: 'rgba(80, 227, 194, 0.9)' },  // Teal
    { base: '#ff792e', glow: 'rgba(255, 121, 46, 0.9)' },  // Orange
  ];

  // Update dimensions on screen resize - FIXED EVENT LISTENER CODE
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height
      });
    };
    
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => {
      // Clean up by removing the subscription
      subscription.remove();
    };
  }, []);

  // Generate initial paths
  useEffect(() => {
    // Function to create randomized SVG path string with mobile optimization
    const createRandomPath = (index) => {
      // Make sure paths cover more screen area
      const screenWidth = dimensions.width;
      const screenHeight = dimensions.height;
      
      // Random starting position covering the entire screen area
      const startX = -screenWidth/2 + Math.random() * screenWidth;
      const startY = -screenHeight/4 + Math.random() * screenHeight/2;
      
      // Control points with wider spread for more interesting curves
      const spread = Math.min(screenWidth, screenHeight) * 1.5;
      const control1X = startX + (-spread/2 + Math.random() * spread);
      const control1Y = startY + (-spread/2 + Math.random() * spread);
      const control2X = startX + (-spread/2 + Math.random() * spread);
      const control2Y = startY + (-spread/2 + Math.random() * spread);
      
      // End point with wider spread
      const endX = startX + (-spread + Math.random() * spread * 2);
      const endY = startY + (-spread + Math.random() * spread * 2);
      
      return `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
    };
    
    // Function to get random color from our glow colors array
    const getRandomColor = () => {
      return glowColors[Math.floor(Math.random() * glowColors.length)];
    };
    
    // Get random path length for varying gap sizes
    const getRandomPathLength = () => {
      return 800 + Math.random() * 1000; // Longer path length for better animation
    };
    
    // Get random speed for more varied animations
    const getRandomSpeed = () => {
      return 8000 + Math.random() * 12000; // 8-20 seconds per loop for smooth appearance
    };
    
    // Get random opacity
    const getRandomOpacity = () => {
      return 0.3 + Math.random() * 0.5; // Higher opacity for better visibility
    };
    
    // Get random thickness - INCREASED FOR VISIBILITY
    const getRandomThickness = () => {
      return 1.5 + Math.random() * 3.5; // Thicker lines between 1.5-5px
    };
    
    // Generate more paths for better coverage
    const newPaths = Array.from({ length: 40 }, (_, i) => {
      const colorSet = getRandomColor();
      const pathLength = getRandomPathLength();
      
      // Random dash pattern for gaps
      const dashLength = pathLength * (0.1 + Math.random() * 0.3); // 10-40% of path is visible
      const gapLength = pathLength * (0.1 + Math.random() * 0.2); // 10-30% of path is gap
      
      return {
        id: `path-${i}`,
        d: createRandomPath(i),
        color: isDarkMode ? colorSet.base : colorSet.base,
        glowColor: colorSet.glow,
        width: getRandomThickness(), // Thicker lines
        opacity: getRandomOpacity(),
        strokeDasharray: `${dashLength} ${gapLength}`,
        strokeDashoffset: new Animated.Value(0),
        animDuration: getRandomSpeed(),
        pathLength: pathLength
      };
    });
    
    setPaths(newPaths);
  }, [isDarkMode, dimensions]);

  // Start animations when paths are created
  useEffect(() => {
    if (paths.length > 0) {
      paths.forEach(path => {
        // Create smooth looping animation that never stops
        Animated.loop(
          Animated.timing(path.strokeDashoffset, {
            toValue: -path.pathLength, // Full negative path length for complete loop
            duration: path.animDuration,
            useNativeDriver: true,
          }),
          { iterations: -1 } // Infinite loop
        ).start();
      });
    }
    
    // Clean up animations on unmount
    return () => {
      paths.forEach(path => {
        path.strokeDashoffset.stopAnimation();
      });
    };
  }, [paths]);

  // Background colors based on theme
  const bgColors = isDarkMode 
    ? ['#000', '#121212'] 
    : ['#f8fafc', '#e2e8f0'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={bgColors}
        style={styles.gradient}
      />
      
      <Svg 
        height="100%" 
        width="100%" 
        style={styles.svg}
        preserveAspectRatio="xMidYMid slice"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        <Defs>
          {/* Create glow filters for each path */}
          {paths.map((path, index) => (
            <RadialGradient
              key={`grad-${index}`}
              id={`grad-${index}`}
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor={path.glowColor} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={path.color} stopOpacity="0.2" />
            </RadialGradient>
          ))}
        </Defs>
        
        {paths.map((path) => (
          <AnimatedPath
            key={path.id}
            d={path.d}
            stroke={path.color}
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            strokeDasharray={path.strokeDasharray}
            strokeDashoffset={path.strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{
              shadowColor: path.glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 8,
              elevation: 15
            }}
          />
        ))}
      </Svg>
      
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

// Create an animated version of the SVG Path component
const AnimatedPath = Animated.createAnimatedComponent(Path);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden', // Ensure no content bleeds outside container
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default FloatingPathsBackground;
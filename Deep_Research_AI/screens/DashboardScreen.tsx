import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions,
  Pressable,
  Platform,
  ActivityIndicator
} from 'react-native';
import { WavyBackground } from '../components/ui/WavyBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons, 
  FontAwesome5, 
  Feather 
} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { toast } from 'sonner-native';
import Svg, {
  Circle,
  Path,
  G,
  Rect,
  Text as SvgText,
  Defs,
  Mask,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
  Filter,
  FeDropShadow
} from 'react-native-svg';
import { useUser } from '../context/UserContext';
import { cacheManager } from '../utils/cacheManager';
import { supabase } from '../utils/supabase';

// Dark Theme Color Palette - Darker shade
const COLORS = {
  midnightNavy: '#050A14',      // Darker background
  glacialTeal: 'rgba(100, 255, 218, 0.7)',
  burnishedGold: '#FFC107',
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)',
  charcoalSmoke: '#191D24',     // Darker card background
  paleMoonlight: '#E0E0E0',
  translucent: 'rgba(25, 29, 36, 0.8)',  // Minimalistic translucent color
};

// Custom blur component for cross-platform compatibility
const GlassMorphicBlur = ({ intensity = 50, tint = 'dark', style, children }) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint} style={style}>
        {children}
      </BlurView>
    );
  }
  
  // For Android, we use a semi-transparent background
  return (
    <View style={[style, { backgroundColor: COLORS.translucent }]}>
      {children}
    </View>
  );
};

// SVG CPU Architecture Animation Component
const CPUArchitectureAnimation = ({ onPress, size, stats }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Define path data for each animation - exactly matching dash.html
  const paths = [
    { d: "M 10 20 h 79.5 q 5 0 5 5 v 30", gradId: "cpu-blue-grad", delay: 1000, duration: 5000 },
    { d: "M 180 10 h -69.7 q -5 0 -5 5 v 30", gradId: "cpu-yellow-grad", delay: 6000, duration: 2000 },
    { d: "M 130 20 v 21.8 q 0 5 -5 5 h -25", gradId: "cpu-pinkish-grad", delay: 4000, duration: 6000 },
    { d: "M 170 80 v -21.8 q 0 -5 -5 -5 h -65", gradId: "cpu-white-grad", delay: 3000, duration: 3000 },
    { d: "M 135 65 h 15 q 5 0 5 5 v 10 q 0 5 -5 5 h -39.8 q -5 0 -5 -5 v -35", gradId: "cpu-green-grad", delay: 9000, duration: 4000 },
    { d: "M 94.8 95 v -46", gradId: "cpu-orange-grad", delay: 3000, duration: 7000 },
    { d: "M 88 88 v -15 q 0 -5 -5 -5 h -10 q -5 0 -5 -5 v -5 q 0 -5 5 -5 h 28", gradId: "cpu-cyan-grad", delay: 4000, duration: 4000 },
    { d: "M 30 30 h 25 q 5 0 5 5 v 6.5 q 0 5 5 5 h 35", gradId: "cpu-rose-grad", delay: 3000, duration: 3000 }
  ];
  
  // Function to extract points from an SVG path - improved parser
  const extractPathPoints = (pathD, numPoints = 100) => {
    const points = [];
    
    // Simple path parsing for the specific path commands used in our SVG
    const parts = pathD.split(/(?=[MmLlHhVvQqCcSsTtAaZz])/);
    
    let x = 0, y = 0;
    let moveToX = 0, moveToY = 0;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      const cmd = part[0];
      const args = part.slice(1).trim().split(/[\s,]+/).map(Number);
      
      switch (cmd) {
        case 'M': // Move to absolute
          x = moveToX = args[0];
          y = moveToY = args[1];
          points.push({ x, y });
          break;
          
        case 'h': // Horizontal line relative
          // Add multiple intermediate points for lines
          const endX = x + args[0];
          for (let j = 1; j <= 10; j++) {
            const t = j / 10;
            points.push({ x: x + (endX - x) * t, y });
          }
          x = endX;
          break;
          
        case 'v': // Vertical line relative
          // Add multiple intermediate points for lines
          const endY = y + args[0];
          for (let j = 1; j <= 10; j++) {
            const t = j / 10;
            points.push({ x, y: y + (endY - y) * t });
          }
          y = endY;
          break;
          
        case 'q': // Quadratic curve
          // For quadratic bezier curves, sample points along the curve
          const controlX = args[0];
          const controlY = args[1];
          const endQX = args[2];
          const endQY = args[3];
          
          for (let t = 0; t <= 1; t += 0.05) {
            // Quadratic bezier formula
            const qx = Math.pow(1 - t, 2) * x + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endQX;
            const qy = Math.pow(1 - t, 2) * y + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endQY;
            points.push({ x: qx, y: qy });
          }
          
          x = endQX;
          y = endQY;
          break;
      }
    }
    
    // Ensure we have enough points by interpolating if needed
    if (points.length < numPoints) {
      const result = [];
      for (let i = 0; i < numPoints; i++) {
        const index = (i / (numPoints - 1)) * (points.length - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        
        if (lowerIndex === upperIndex) {
          result.push(points[lowerIndex]);
        } else {
          const t = index - lowerIndex;
          const p1 = points[lowerIndex];
          const p2 = points[upperIndex];
          result.push({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
          });
        }
      }
      return result;
    }
    
    return points;
  };
  
  // Animations for the circling lights
  const AnimatedCircle = ({ path, delay, duration, gradId }) => {
    const [position, setPosition] = useState(0);
    const points = extractPathPoints(path.d);
    
    useEffect(() => {
      let animationFrame;
      let startTime;
      
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        
        // Calculate position (0 to 1) with delay
        if (elapsed > delay) {
          const positionInAnimation = ((elapsed - delay) % duration) / duration;
          setPosition(positionInAnimation);
        }
        
        if (mounted) {
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
      
      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }, [delay, duration, mounted]);
    
    // Get current point on the path
    const pointIndex = Math.floor(position * (points.length - 1));
    const currentPoint = points[Math.min(pointIndex, points.length - 1)];
    
    return (
      <Circle 
        cx={currentPoint?.x || 0} 
        cy={currentPoint?.y || 0} 
        r="8" 
        fill={`url(#${gradId})`} 
      />
    );
  };
  
  return (
    <Pressable onPress={onPress} style={styles.cpuButtonContainer}>
      <Svg 
        width={size} 
        height={size * 0.8} 
        viewBox="0 0 200 100"
        style={styles.cpuSvg}
      >
        <Defs>
          {/* CPU connection gradient */}
          <SvgLinearGradient id="cpu-connection-gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4F4F4F" />
            <Stop offset="60%" stopColor="#121214" />
          </SvgLinearGradient>
          
          {/* CPU Text Gradient - Make it more linear */}
          <SvgLinearGradient id="cpu-text-gradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#666666" />
            <Stop offset="50%" stopColor="white" stopOpacity="1" />
            <Stop offset="100%" stopColor="#666666" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Paths */}
        <G stroke="#666" fill="none" strokeWidth="0.3">
          {paths.map((path, index) => (
            <Path key={`path-${index}`} d={path.d} />
          ))}
        </G>

        {/* New Research Button (replaces CPU box) */}
        <G>
          {/* Cpu connections */}
          <G fill="url(#cpu-connection-gradient)">
            <Rect x="93" y="37" width="2.5" height="5" rx="0.7" />
            <Rect x="104" y="37" width="2.5" height="5" rx="0.7" />
            <Rect x="116.3" y="44" width="2.5" height="5" rx="0.7" />
            <Rect x="122.8" y="44" width="2.5" height="5" rx="0.7" />
            <Rect x="104" y="16" width="2.5" height="5" rx="0.7" />
            <Rect x="114.5" y="16" width="2.5" height="5" rx="0.7" />
            <Rect x="80" y="14" width="2.5" height="5" rx="0.7" />
            <Rect x="87" y="14" width="2.5" height="5" rx="0.7" />
          </G>
          
          {/* Main Button Rectangle - Added stroke/border to match circle buttons */}
          <Rect 
            x="60" 
            y="40" 
            width="80" 
            height="20" 
            rx="3" 
            fill="#181818" 
            stroke="rgba(100, 255, 218, 0.3)" 
            strokeWidth="1.5"
          />
          
          {/* Button Text - Centered and aligned better */}
          <SvgText 
            x="100" 
            y="53" 
            fontSize="6" 
            fill="url(#cpu-text-gradient)" 
            fontWeight="700" 
            letterSpacing="0.05"
            textAnchor="middle" 
            alignmentBaseline="middle"
          >
            START + RESEARCH
          </SvgText>
        </G>
      </Svg>
    </Pressable>
  );
};

// Define dashboard caching constants
const DASHBOARD_CACHE_KEY = 'dashboard_stats';
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function DashboardScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const { theme, isDarkMode } = useTheme();
  const { userId } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalResearch: 0,
    completedResearch: 0,
    pendingResearch: 0,
    recentAgents: []
  });
  
  // Fetch dashboard statistics with caching
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Use cacheManager to get stats with caching
        const cacheKey = `${DASHBOARD_CACHE_KEY}_${userId}`;
        const stats = await cacheManager.getOrFetch(
          cacheKey,
          () => fetchDashboardStatsFromApi(userId),
          { ttl: DASHBOARD_CACHE_TTL }
        );
        
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Use default stats on error
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, [userId]);
  
  // Fetch dashboard statistics from API
  const fetchDashboardStatsFromApi = async (userId) => {
    // Default stats
    const defaultStats = {
      totalResearch: 0,
      completedResearch: 0,
      pendingResearch: 0,
      recentAgents: []
    };
    
    try {
      // Fetch research history stats from Supabase
      const { data: historyData, error: historyError } = await supabase
        .from('research_history_new')
        .select('research_id, status, agent')
        .eq('user_id', userId);
      
      if (historyError) {
        console.error('Error fetching research history stats:', historyError);
        return defaultStats;
      }
      
      // Calculate stats
      const totalResearch = historyData.length;
      const completedResearch = historyData.filter(item => item.status === 'completed').length;
      const pendingResearch = historyData.filter(item => item.status !== 'completed').length;
      
      // Get recent agents used
      const agentCounts = {};
      historyData.forEach(item => {
        const agent = item.agent || 'General Agent';
        agentCounts[agent] = (agentCounts[agent] || 0) + 1;
      });
      
      // Sort agents by usage count
      const recentAgents = Object.entries(agentCounts)
        .map(([agent, count]) => ({ agent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4); // Take top 4 agents
      
      return {
        totalResearch,
        completedResearch, 
        pendingResearch,
        recentAgents
      };
    } catch (error) {
      console.error('Error in fetchDashboardStatsFromApi:', error);
      return defaultStats;
    }
  };
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };
  
  // Get screen dimensions for responsive layout
  const { width, height } = Dimensions.get('window');
  const isSmallScreen = width < 380;
  
  // Circle sizes
  const centerCircleSize = Math.min(width, height) * 0.6; // Further increased size
  const outerCircleSize = Math.min(width, height) * 0.20;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Simple dark background */}
      <View style={styles.backgroundContainer} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.paleMoonlight} />
          </TouchableOpacity>
          
          <View style={styles.emptySpace} />
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={28} color={COLORS.paleMoonlight} />
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      {/* Circular Buttons Layout with conditional loading indicator */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.glacialTeal} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <Animated.View 
          style={[
            styles.circularContainer,
            { opacity: fadeAnim }
          ]}
        >
          {/* Render stats on the central CPU visualization */}
          
          {/* Center Button - CPU Architecture with Stats */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={[styles.centerButtonWrapper]}
          >
            <CPUArchitectureAnimation 
              onPress={() => navigateToScreen('ChooseAgentScreen')}
              size={centerCircleSize}
              stats={dashboardStats}
            />
          </MotiView>
          
          {/* Top Button - History - Repositioned to top left of rectangle */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
            style={[
              styles.outerButtonWrapper,
              { top: '20%', left: '25%', zIndex: 10 }
            ]}
          >
            <CircleButton 
              title="History"
              icon={<MaterialIcons name="history" size={28} color={COLORS.paleMoonlight} />}
              onPress={() => navigateToScreen('History')}
              size={outerCircleSize}
            />
          </MotiView>
          
          {/* Right Button - Active Queue - Repositioned to top right of rectangle */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 150 }}
            style={[
              styles.outerButtonWrapper,
              { top: '20%', right: '25%', zIndex: 10 }
            ]}
          >
            <CircleButton 
              title="Queue"
              icon={<MaterialCommunityIcons name="clipboard-text-clock" size={28} color={COLORS.paleMoonlight} />}
              onPress={() => navigateToScreen('Queue')}
              size={outerCircleSize}
            />
          </MotiView>
          
          {/* Bottom Button - Find Study - Repositioned to bottom right of rectangle */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 200 }}
            style={[
              styles.outerButtonWrapper,
              { bottom: '20%', right: '25%', zIndex: 10 }
            ]}
          >
            <CircleButton 
              title="Find Study"
              icon={<Feather name="search" size={28} color={COLORS.paleMoonlight} />}
              onPress={() => navigateToScreen('FindStudyScreen')}
              size={outerCircleSize}
            />
          </MotiView>
          
          {/* Left Button - Our Agents - Repositioned to bottom left of rectangle */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 250 }}
            style={[
              styles.outerButtonWrapper,
              { bottom: '20%', left: '25%', zIndex: 10 }
            ]}
          >
            <CircleButton 
              title="Agents"
              icon={<FontAwesome5 name="robot" size={28} color={COLORS.paleMoonlight} />}
              onPress={() => navigateToScreen('AgentListScreen')}
              size={outerCircleSize}
            />
          </MotiView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// Circle Button Component
const CircleButton = ({ title, icon, onPress, size, isPrimary = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);
  
  useEffect(() => {
    if (isPressed) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [isPressed]);
  
  return (
    <Pressable
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
      style={[styles.circleButtonContainer, { width: size, height: size }]}
    >
      <Animated.View 
        style={[
          styles.circleButton,
          { 
            transform: [{ scale: scaleAnim }],
            borderColor: isPrimary ? COLORS.glacialTeal : 'rgba(100, 255, 218, 0.3)',
            width: size,
            height: size,
          }
        ]}
      >
        <GlassMorphicBlur intensity={isPrimary ? 40 : 30} style={styles.circleBlurContainer}>
          <Animated.View 
            style={[
              styles.buttonGlow,
              {
                opacity: glowAnim,
                backgroundColor: isPrimary ? COLORS.glacialTeal : COLORS.deepCoralGlow,
              }
            ]} 
          />
          <View style={styles.circleButtonContent}>
            <View style={styles.circleButtonIcon}>
              {icon}
            </View>
            <Text style={[
              styles.circleButtonText,
              isPrimary ? styles.primaryButtonText : null
            ]}>
              {title}
            </Text>
          </View>
        </GlassMorphicBlur>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.midnightNavy,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backgroundContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.midnightNavy,
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
    borderRadius: 20,
    backgroundColor: COLORS.translucent,
  },
  emptySpace: {
    flex: 1,
  },
  profileButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.translucent,
  },
  circularContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  outerButtonWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // CPU Button Styles 
  cpuButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cpuSvg: {
    backgroundColor: 'transparent',
  },
  cpuButtonLabel: {
    color: COLORS.paleMoonlight,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Circle Button Styles
  circleButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleButton: {
    borderRadius: 1000, // Large value for perfect circle
    overflow: 'hidden',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.glacialTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  circleBlurContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 1000,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  circleButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  circleButtonIcon: {
    marginBottom: 8,
  },
  circleButtonText: {
    color: COLORS.paleMoonlight,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.paleMoonlight,
  }
});
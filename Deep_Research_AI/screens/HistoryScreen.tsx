import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { supabase } from '../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useResearch } from '../context/ResearchContext';
import { fetchResearchHistoryWithCache, clearResearchCache } from '../utils/researchService';
import { useUser } from '../context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

// Define our cosmic theme palette to match other screens
const COSMIC_THEME = {
  midnightNavy: '#0A1128',
  deeperNavy: '#050A18', // Even darker shade for background
  glacialTeal: 'rgba(100, 255, 218, 0.7)',
  burnishedGold: '#FFC107',
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)',
  charcoalSmoke: 'rgba(45, 52, 57, 0.65)',
  paleMoonlight: '#E0E0E0',
  cardBackground: 'rgba(45, 52, 57, 0.45)', // Translucent charcoal for cards
  cardGlow: 'rgba(100, 255, 218, 0.1)',     // Subtle teal glow
  accentGlow: 'rgba(255, 193, 7, 0.15)',    // Subtle gold glow
};

// Define navigation prop type
type NavigationProp = any;

// Create a GlassMorphicCard component for consistent styling
const GlassMorphicCard = ({ 
  children, 
  style, 
  intensity = 15,
  glowColor = COSMIC_THEME.glacialTeal
}: { 
  children: React.ReactNode; 
  style?: any;
  intensity?: number;
  glowColor?: string;
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

// Format date string to a more readable format
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

// Helper to get a color based on research status
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return COSMIC_THEME.glacialTeal;
    case 'pending':
      return COSMIC_THEME.burnishedGold;
    case 'failed':
      return COSMIC_THEME.deepCoralGlow;
    default:
      return 'rgba(224, 224, 224, 0.6)';
  }
};

// Helper to get a status icon based on research status
const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'checkmark-circle';
    case 'pending':
      return 'time';
    case 'failed':
      return 'close-circle';
    default:
      return 'help-circle';
  }
};

// Date filtering options
const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

// Check if a date falls within a specific time range
const isDateInRange = (dateString: string, range: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  
  switch (range) {
    case 'today':
      return date.toDateString() === now.toDateString();
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return date >= weekStart;
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= monthStart;
    }
    default:
      return true; // 'all' or invalid range returns true
  }
};

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const { setCurrentResearch } = useResearch();
  const { theme } = useTheme();
  const { userId } = useUser();
  
  // New state for search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('all');
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);

  // Fetch research history with caching
  useEffect(() => {
    console.log('HistoryScreen mounted');
    fetchHistory();
  }, []);
  
  // Generate list of available agents from history
  useEffect(() => {
    if (history.length > 0) {
      const agents = ['all', ...new Set(history.map(item => item.agent || 'General Agent'))];
      setAvailableAgents(agents);
    }
  }, [history]);
  
  // Update filtered history when search query or filters change
  useEffect(() => {
    let filtered = [...history];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const lowercaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.query?.toLowerCase() || '').includes(lowercaseQuery) ||
        (item.agent?.toLowerCase() || '').includes(lowercaseQuery)
      );
    }
    
    // Apply date filter
    if (selectedDateFilter !== 'all') {
      filtered = filtered.filter(item => 
        isDateInRange(item.created_at, selectedDateFilter)
      );
    }
    
    // Apply agent filter
    if (selectedAgentFilter !== 'all') {
      filtered = filtered.filter(item => 
        (item.agent || 'General Agent') === selectedAgentFilter
      );
    }
    
    setFilteredHistory(filtered);
  }, [searchQuery, history, selectedDateFilter, selectedAgentFilter]);
  
  // Refresh history data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('HistoryScreen focused - checking for background refresh');
      
      if (userId) {
        // Background refresh without loading indicator
        backgroundRefresh();
      }
      
      return () => {
        // Optional cleanup if needed
      };
    }, [userId])
  );

  const fetchHistory = async () => {
    try {
      console.log('Fetching history...');
      setLoading(true);

      if (!userId) {
        console.error('No user ID found');
        Alert.alert('Error', 'Not logged in');
        navigation.replace('Login');
        return;
      }

      console.log('Fetching cached history for user:', userId);
      
      // Use our cached fetch method
      const data = await fetchResearchHistoryWithCache(userId);
      
      if (!data) {
        console.log('No data returned from query');
        setHistory([]);
        setFilteredHistory([]);
        return;
      }

      console.log('History items:', data.length);
      setHistory(data);
      setFilteredHistory(data);
    } catch (error: any) {
      console.error('Error fetching history:', error.message);
      Alert.alert('Error', 'Failed to load research history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Perform background refresh without showing full loading indicator
  const backgroundRefresh = async () => {
    if (backgroundRefreshing) return;
    
    try {
      setBackgroundRefreshing(true);
      if (userId) {
        // Fetch fresh data with background refresh option
        const data = await fetchResearchHistoryWithCache(userId, { 
          forceRefresh: true,
          background: true 
        });
        
        if (data) {
          setHistory(data);
          // Update filtered results based on current search
          if (searchQuery.trim() === '') {
            setFilteredHistory(data);
          } else {
            const lowercaseQuery = searchQuery.toLowerCase();
            const filtered = data.filter(item => 
              item.query.toLowerCase().includes(lowercaseQuery) ||
              item.agent.toLowerCase().includes(lowercaseQuery)
            );
            setFilteredHistory(filtered);
          }
          console.log('History refreshed in background successfully');
        }
      }
    } catch (error) {
      console.error('Error in background refresh:', error);
    } finally {
      setBackgroundRefreshing(false);
    }
  };

  // Force refresh data - bypasses cache
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (userId) {
        // Clear the cache for this user
        await clearResearchCache(userId);
        
        // Fetch fresh data with forceRefresh option
        const data = await fetchResearchHistoryWithCache(userId, { 
          forceRefresh: true,
          background: false
        });
        
        if (data) {
          setHistory(data);
          // Update filtered results based on current search
          if (searchQuery.trim() === '') {
            setFilteredHistory(data);
          } else {
            const lowercaseQuery = searchQuery.toLowerCase();
            const filtered = data.filter(item => 
              item.query.toLowerCase().includes(lowercaseQuery) ||
              item.agent.toLowerCase().includes(lowercaseQuery)
            );
            setFilteredHistory(filtered);
          }
          console.log('History refreshed successfully');
        }
      }
    } catch (error) {
      console.error('Error refreshing history:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const viewResearchDetails = (item: any) => {
    console.log('Viewing research details:', item.research_id);
    
    // Save to context for global access if needed
    setCurrentResearch({
      researchId: item.research_id,
      query: item.query,
      agent: item.agent,
      breadth: item.breadth || 3, // Default to 3 if not provided
      depth: item.depth || 3,     // Default to 3 if not provided
      status: item.status
    });
    
    // Prepare common navigation params
    const commonParams = {
      research_id: item.research_id,
      researchId: item.research_id, // Include both formats for compatibility
      query: item.query,
      breadth: item.breadth || 3,
      depth: item.depth || 3,
      agent: item.agent
    };
    
    // Navigate to appropriate screen based on status
    if (item.status?.toLowerCase() === 'completed') {
      navigation.navigate('ResearchResultScreen', commonParams);
    } else {
      navigation.navigate('ResearchProgressScreen', commonParams);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedDateFilter('all');
    setSelectedAgentFilter('all');
    setSearchQuery('');
  };
  
  // Apply filters and close modal
  const applyFilters = () => {
    setFilterModalVisible(false);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return selectedDateFilter !== 'all' || selectedAgentFilter !== 'all';
  }, [selectedDateFilter, selectedAgentFilter]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[COSMIC_THEME.deeperNavy, COSMIC_THEME.midnightNavy]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(45, 52, 57, 0.7)', 'rgba(45, 52, 57, 0.5)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.title}>Research History</Text>
        
        {backgroundRefreshing ? (
          <ActivityIndicator size="small" color={COSMIC_THEME.glacialTeal} />
        ) : (
          <TouchableOpacity 
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Feather 
              name="filter" 
              size={20} 
              color={hasActiveFilters ? COSMIC_THEME.glacialTeal : COSMIC_THEME.paleMoonlight} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Search bar */}
      <GlassMorphicCard style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color={COSMIC_THEME.glacialTeal} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search research topics..."
            placeholderTextColor="rgba(224, 224, 224, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={COSMIC_THEME.glacialTeal}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Feather name="x" size={18} color="rgba(224, 224, 224, 0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </GlassMorphicCard>

      {/* Filter active indicator */}
      {hasActiveFilters && (
        <View style={styles.filterActiveContainer}>
          <Text style={styles.filterActiveText}>
            Filters applied: 
            {selectedDateFilter !== 'all' && 
              ` ${DATE_FILTERS.find(d => d.id === selectedDateFilter)?.label}`}
            {selectedAgentFilter !== 'all' && 
              ` • ${selectedAgentFilter}`}
          </Text>
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.filterClearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main content - loading, empty state, or list */}
      
      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalDismissArea} 
            onPress={() => setFilterModalVisible(false)}
          />
          
          <MotiView
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250 }}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Research</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Feather name="x" size={24} color={COSMIC_THEME.paleMoonlight} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.filterSection}>
                {/* Date filters */}
                <Text style={styles.filterSectionTitle}>Date</Text>
                <View style={styles.filterOptions}>
                  {DATE_FILTERS.map(filter => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        selectedDateFilter === filter.id && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedDateFilter(filter.id)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedDateFilter === filter.id && styles.filterOptionTextSelected
                      ]}>
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Agent filters */}
                <Text style={styles.filterSectionTitle}>Research Agent</Text>
                <View style={styles.filterOptions}>
                  {availableAgents.map(agent => (
                    <TouchableOpacity
                      key={agent}
                      style={[
                        styles.filterOption,
                        selectedAgentFilter === agent && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedAgentFilter(agent)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedAgentFilter === agent && styles.filterOptionTextSelected
                      ]}>
                        {agent === 'all' ? 'All Agents' : agent}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalResetButton}
                  onPress={resetFilters}
                >
                  <Text style={styles.modalResetButtonText}>Reset</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalApplyButton}
                  onPress={applyFilters}
                >
                  <LinearGradient
                    colors={['rgba(100, 255, 218, 0.8)', 'rgba(59, 130, 246, 0.8)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalApplyGradient}
                  >
                    <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </MotiView>
        </View>
      </Modal>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 600 }}
            style={styles.loadingWrapper}
          >
            <LinearGradient
              colors={['rgba(10, 17, 40, 0.7)', 'rgba(10, 17, 40, 0.5)']}
              style={styles.loadingGradient}
            >
              <ActivityIndicator size="large" color={COSMIC_THEME.glacialTeal} />
              <Text style={styles.loadingText}>
                Loading history...
              </Text>
            </LinearGradient>
          </MotiView>
        </View>
      ) : filteredHistory.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COSMIC_THEME.glacialTeal]}
              tintColor={COSMIC_THEME.glacialTeal}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              style={styles.emptyIconContainer}
            >
              <MaterialIcons 
                name={searchQuery ? "search-off" : "history"} 
                size={60} 
                color={COSMIC_THEME.glacialTeal} 
              />
            </MotiView>
            
            <Text style={styles.emptyText}>
              {searchQuery ? "No matching research found" : "No research history found"}
            </Text>
            
            <Text style={styles.emptySubtext}>
              {searchQuery ? "Try a different search term" : "Start a new research to see it here"}
            </Text>
            
            {searchQuery ? (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.newResearchButton}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <LinearGradient
                  colors={['rgba(100, 255, 218, 0.8)', 'rgba(59, 130, 246, 0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.newResearchButtonText}>Start New Research</Text>
                  <Feather name="plus" size={18} color={COSMIC_THEME.midnightNavy} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <AnimatePresence>
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.research_id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COSMIC_THEME.glacialTeal]}
                tintColor={COSMIC_THEME.glacialTeal}
              />
            }
            renderItem={({ item, index }) => (
              <MotiView
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 100, type: 'timing', duration: 500 }}
                style={styles.cardContainer}
              >
                <TouchableOpacity
                  onPress={() => viewResearchDetails(item)}
                  activeOpacity={0.8}
                >
                  <GlassMorphicCard>
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.query} numberOfLines={2}>
                            {item.query}
                          </Text>
                        </View>
                        
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: `${getStatusColor(item.status)}20` }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(item.status)} 
                            size={14} 
                            color={getStatusColor(item.status)} 
                            style={styles.statusIcon}
                          />
                          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                            {item.status || 'Unknown'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <MaterialIcons name="category" size={16} color={COSMIC_THEME.glacialTeal} />
                            <Text style={styles.detailText}>
                              {item.agent || 'General Agent'}
                            </Text>
                          </View>
                          
                          <View style={styles.detailItem}>
                            <MaterialIcons name="access-time" size={16} color={COSMIC_THEME.glacialTeal} />
                            <Text style={styles.detailText}>
                              {formatDate(item.created_at)}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <MaterialIcons name="device-hub" size={16} color={COSMIC_THEME.glacialTeal} />
                            <Text style={styles.detailText}>
                              Breadth: {item.breadth || 3}
                            </Text>
                          </View>
                          
                          <View style={styles.detailItem}>
                            <Ionicons name="layers-outline" size={16} color={COSMIC_THEME.glacialTeal} />
                            <Text style={styles.detailText}>
                              Depth: {item.depth || 3}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.cardFooter}>
                        <TouchableOpacity 
                          style={styles.viewButton}
                          onPress={() => viewResearchDetails(item)}
                        >
                          <Text style={styles.viewButtonText}>
                            {item.status?.toLowerCase() === 'completed' ? 'View Results' : 'View Progress'}
                          </Text>
                          <MaterialIcons name="arrow-forward" size={16} color={COSMIC_THEME.glacialTeal} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </GlassMorphicCard>
                </TouchableOpacity>
              </MotiView>
            )}
          />
        </AnimatePresence>
      )}
    </View>
  );
}

import { StatusBar } from 'expo-status-bar';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COSMIC_THEME.deeperNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 255, 218, 0.1)',
  },
  backButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 12,
  },
  backButtonGradient: {
    padding: 8,
    borderRadius: 30, 
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  headerPlaceholder: {
    width: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COSMIC_THEME.paleMoonlight,
    flex: 1,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderColor: 'rgba(100, 255, 218, 0.15)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: COSMIC_THEME.paleMoonlight,
    fontSize: 16,
    outlineStyle: 'none',
    borderWidth: 0,
  },
  clearButton: {
    padding: 6,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  query: {
    fontSize: 18,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    backgroundColor: 'rgba(10, 17, 40, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: COSMIC_THEME.paleMoonlight,
    marginLeft: 6,
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  viewButtonText: {
    color: COSMIC_THEME.glacialTeal,
    fontWeight: '600',
    marginRight: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    marginBottom: 24,
    shadowColor: COSMIC_THEME.glacialTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(224, 224, 224, 0.7)',
    marginBottom: 24,
  },
  newResearchButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '80%',
    maxWidth: 300,
    shadowColor: COSMIC_THEME.glacialTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  newResearchButtonText: {
    color: COSMIC_THEME.midnightNavy,
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
  },
  clearSearchButton: {
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearSearchButtonText: {
    color: COSMIC_THEME.glacialTeal,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrapper: {
    alignItems: 'center',
  },
  loadingGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COSMIC_THEME.paleMoonlight,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 52, 57, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(45, 52, 57, 0.8)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(100, 255, 218, 0.15)',
    borderColor: 'rgba(100, 255, 218, 0.3)',
  },
  filterActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  filterActiveText: {
    fontSize: 14,
    color: COSMIC_THEME.paleMoonlight,
    flex: 1,
  },
  filterClearText: {
    fontSize: 14,
    color: COSMIC_THEME.glacialTeal,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 24, 0.7)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: COSMIC_THEME.midnightNavy,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 255, 218, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
  },
  modalCloseButton: {
    padding: 4,
  },
  filterSection: {
    padding: 16,
    maxHeight: 400,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COSMIC_THEME.paleMoonlight,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  filterOption: {
    backgroundColor: 'rgba(10, 17, 40, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.1)',
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(100, 255, 218, 0.15)',
    borderColor: 'rgba(100, 255, 218, 0.3)',
  },
  filterOptionText: {
    fontSize: 14,
    color: COSMIC_THEME.paleMoonlight,
  },
  filterOptionTextSelected: {
    color: COSMIC_THEME.glacialTeal,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 255, 218, 0.1)',
  },
  modalResetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalResetButtonText: {
    fontSize: 16,
    color: 'rgba(224, 224, 224, 0.7)',
    fontWeight: '600',
  },
  modalApplyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalApplyGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COSMIC_THEME.midnightNavy,
  },
});
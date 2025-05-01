import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../context/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

// Define the cosmic theme palette
const COSMIC_THEME = {
  midnightNavy: '#0A1128',
  deeperNavy: '#070E21',
  glacialTeal: 'rgba(100, 255, 218, 0.7)',
  burnishedGold: '#FFC107',
  deepCoralGlow: 'rgba(255, 111, 97, 0.2)',
  charcoalSmoke: '#2D3439',
  paleMoonlight: '#E0E0E0',
  cardBackground: 'rgba(45, 52, 57, 0.65)',
  cardGlow: 'rgba(100, 255, 218, 0.1)',
  accentGlow: 'rgba(255, 193, 7, 0.15)',
  errorGlow: 'rgba(255, 111, 97, 0.5)',
};

type RootStackParamList = {
  LoginScreen: undefined;
  HistoryScreen: undefined;
  ResearchResultScreen: { researchId: string };
  SeedDataScreen: undefined;
  ResearchResult: { researchId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PublicResearch {
  research_id: string;
  query: string;
  result: string;
  created_at: string;
}

export default function FindStudyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [publicResearch, setPublicResearch] = useState<PublicResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState<PublicResearch[]>([]);

  const performSemanticSearch = async (query: string) => {
    if (!query.trim()) {
      await fetchPublicResearch();
      return;
    }

    try {
      setLoading(true);
      const searchTerms = query.toLowerCase().split(' ');
      const relatedTerms: { [key: string]: string[] } = {
        // Health & Medicine
        'health': ['medical', 'wellness', 'disease', 'treatment', 'therapy', 'care', 'hospital', 'doctor', 'patient', 'medicine', 'pharmacy', 'diagnosis'],
        'neuron': ['brain', 'nervous system', 'synapse', 'cognitive', 'mental health', 'psychology', 'neurology', 'neuroscience', 'brain function'],
        'disease': ['illness', 'condition', 'symptoms', 'diagnosis', 'treatment', 'cure', 'prevention', 'healthcare'],
        
        // Technology & Computing
        'ai': ['artificial intelligence', 'machine learning', 'neural network', 'deep learning', 'automation', 'robotics', 'computer vision', 'natural language processing'],
        'tech': ['technology', 'innovation', 'digital', 'software', 'hardware', 'computing', 'internet', 'cybersecurity'],
        'data': ['information', 'analysis', 'statistics', 'database', 'processing', 'big data', 'data science', 'analytics', 'visualization'],
        
        // Business & Finance
        'business': ['company', 'enterprise', 'management', 'strategy', 'market', 'industry', 'commerce', 'trade', 'economics'],
        'finance': ['banking', 'investment', 'stock market', 'trading', 'financial', 'money', 'capital', 'assets', 'portfolio'],
        'market': ['economy', 'trading', 'stocks', 'shares', 'investment', 'financial markets', 'trading floor', 'market analysis'],
        
        // Science & Research
        'quantum': ['physics', 'mechanics', 'entanglement', 'superposition', 'atomic', 'particle', 'quantum computing', 'quantum mechanics'],
        'research': ['study', 'investigation', 'analysis', 'experiment', 'scientific method', 'hypothesis', 'theory', 'discovery'],
        'science': ['scientific', 'research', 'experiment', 'laboratory', 'discovery', 'innovation', 'technology', 'engineering'],
        
        // Education & Learning
        'education': ['learning', 'teaching', 'school', 'university', 'academic', 'curriculum', 'student', 'knowledge', 'training'],
        'learning': ['education', 'training', 'skill development', 'knowledge acquisition', 'teaching', 'instruction', 'pedagogy'],
        
        // Environment & Sustainability
        'environment': ['climate', 'sustainability', 'ecology', 'conservation', 'green', 'renewable', 'pollution', 'climate change'],
        'climate': ['weather', 'temperature', 'global warming', 'climate change', 'environment', 'atmosphere', 'greenhouse'],
        
        // Social Sciences
        'society': ['community', 'social', 'culture', 'population', 'demographics', 'social behavior', 'human behavior'],
        'psychology': ['mental', 'behavior', 'cognitive', 'emotional', 'psychological', 'mental health', 'therapy', 'counseling'],
        
        // Engineering
        'engineering': ['design', 'construction', 'mechanical', 'electrical', 'civil', 'aerospace', 'industrial', 'systems'],
        'robotics': ['automation', 'mechanical', 'artificial intelligence', 'machine learning', 'control systems', 'automation'],
        
        // Agriculture & Food
        'agriculture': ['farming', 'crops', 'food production', 'sustainable farming', 'agricultural technology', 'food security'],
        'food': ['nutrition', 'diet', 'agriculture', 'food production', 'food security', 'sustainable food', 'food science']
      };

      // First, search in research_results_new
      const { data: resultsData, error: resultsError } = await supabase
        .from('research_results_new')
        .select('research_id, result');

      if (resultsError) throw resultsError;

      // Filter results based on semantic search
      const matchingResults = resultsData.filter(item => {
        const content = item.result.toLowerCase();
        
        // Check for direct matches
        const hasDirectMatch = searchTerms.some(term => content.includes(term));
        if (hasDirectMatch) return true;

        // Check for semantic matches
        const hasSemanticMatch = searchTerms.some(term => {
          const relatedWords = relatedTerms[term] || [];
          return relatedWords.some(relatedTerm => content.includes(relatedTerm));
        });

        return hasSemanticMatch;
      });

      // Get the research_ids from matching results
      const matchingResearchIds = matchingResults.map(item => item.research_id);

      // Then, get the public research details
      const { data: publicData, error: publicError } = await supabase
        .from('public_research_page')
        .select('*')
        .in('research_id', matchingResearchIds)
        .eq('is_public', true);

      if (publicError) throw publicError;

      // Combine the data
      const transformedData = publicData.map(item => {
        const result = matchingResults.find(r => r.research_id === item.research_id);
        return {
          research_id: item.research_id,
          query: item.query,
          result: result?.result || 'Click to view full research',
          created_at: item.created_at,
        };
      });

      setPublicResearch(transformedData);
      setSearchResults(transformedData);
    } catch (error) {
      console.error('Error performing semantic search:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicResearch = async () => {
    try {
      setLoading(true);
      const { data: publicData, error: publicError } = await supabase
        .from('public_research_page')
        .select(`
          id,
          research_id,
          query,
          created_at,
          status,
          is_public
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (publicError) throw publicError;

      // Get the research results for public research
      const researchIds = publicData.map(item => item.research_id);
      const { data: resultsData, error: resultsError } = await supabase
        .from('research_results_new')
        .select('research_id, result')
        .in('research_id', researchIds);

      if (resultsError) throw resultsError;

      // Combine the data
      const transformedData = publicData.map(item => {
        const result = resultsData.find(r => r.research_id === item.research_id);
        return {
          research_id: item.research_id,
          query: item.query,
          result: result?.result || 'Click to view full research',
          created_at: item.created_at,
        };
      });

      setPublicResearch(transformedData);
      setSearchResults(transformedData);
    } catch (error) {
      console.error('Error fetching public research:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublicResearch();
  }, []);

  // Update search when query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSemanticSearch(searchQuery);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPublicResearch();
  };

  const renderResearchItem = ({ item }: { item: PublicResearch }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: 100 }}
    >
      <TouchableOpacity
        style={[styles.researchCard, { backgroundColor: COSMIC_THEME.cardBackground, borderColor: 'rgba(100, 255, 218, 0.1)' }]}
        onPress={() => navigation.navigate('ResearchResultScreen', { researchId: item.research_id })}
      >
        <View style={styles.researchHeader}>
          <Text style={[styles.researchTitle, { color: COSMIC_THEME.paleMoonlight }]} numberOfLines={2}>
            {item.query}
          </Text>
          <Text style={[styles.researchDate, { color: 'rgba(224, 224, 224, 0.7)' }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.researchPreview, { color: 'rgba(224, 224, 224, 0.7)' }]} numberOfLines={3}>
          {item.result}
        </Text>
        <View style={styles.researchFooter}>
          <TouchableOpacity 
            style={[styles.viewDetailsButton, { backgroundColor: COSMIC_THEME.glacialTeal }]}
            onPress={() => navigation.navigate('ResearchResultScreen', { researchId: item.research_id })}
          >
            <Text style={[styles.viewDetailsText, { color: COSMIC_THEME.midnightNavy }]}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COSMIC_THEME.midnightNavy }]}>
      <StatusBar style="light" />
      
      <LinearGradient 
        colors={[COSMIC_THEME.deeperNavy, COSMIC_THEME.midnightNavy]} 
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COSMIC_THEME.paleMoonlight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Research</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={COSMIC_THEME.glacialTeal} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search research papers..."
          placeholderTextColor="rgba(224, 224, 224, 0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={COSMIC_THEME.glacialTeal}
          returnKeyType="search"
        />
      </View>

      <Text style={styles.sectionTitle}>Recent Publications</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COSMIC_THEME.glacialTeal} />
          <Text style={styles.loadingText}>Loading research papers...</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color="rgba(224, 224, 224, 0.5)" />
          <Text style={styles.emptyText}>
            No matching research papers found
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderResearchItem}
          keyExtractor={item => item.research_id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COSMIC_THEME.glacialTeal}
              colors={[COSMIC_THEME.glacialTeal]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 255, 218, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COSMIC_THEME.paleMoonlight,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 52, 57, 0.8)',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.1)',
    shadowColor: COSMIC_THEME.cardGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COSMIC_THEME.paleMoonlight,
    height: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COSMIC_THEME.glacialTeal,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  researchCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: COSMIC_THEME.cardGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  researchHeader: {
    marginBottom: 8,
  },
  researchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  researchDate: {
    fontSize: 14,
  },
  researchPreview: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  researchFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  viewDetailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COSMIC_THEME.paleMoonlight,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    color: 'rgba(224, 224, 224, 0.7)',
  },
});
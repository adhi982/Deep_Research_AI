import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Linking,
  Dimensions
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Link {
  url: string;
  title: string;
}

interface TopicCardProps {
  topic: string;
  links: Link[];
  index: number;
  totalCount: number;
  isActive?: boolean;
  createdAt?: string;
  isLastItem?: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  links,
  index,
  totalCount,
  isActive = false,
  createdAt,
  isLastItem = false
}) => {
  // Check if this is a completion topic or system card
  const isCompletionTopic = topic.toLowerCase().includes('research_done');
  const isSystemCard = isCompletionTopic || 
                      topic.toLowerCase().includes('firing') || 
                      topic.toLowerCase().includes('preparing') || 
                      topic.toLowerCase().includes('ready');
  
  // Render source links
  const renderSourceLinks = () => {
    if (!links || links.length === 0) {
      return null; // Instead of displaying "No sources found yet", return null
    }
    
    return (
      <View style={styles.sourcesContainer}>
        {links.map((link, i) => (
          <TouchableOpacity 
            key={i}
            style={styles.sourceLink}
            onPress={() => Linking.openURL(link.url)}
          >
            <Feather name="external-link" size={12} color="#6366f1" />
            <Text style={styles.sourceLinkText} numberOfLines={1}>
              {link.title || link.url}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: index * 100 }}
      style={[
        styles.topicCard,
        isActive && styles.activeTopicCard,
        isCompletionTopic && styles.doneTopicCard
      ]}
    >
      {/* Topic Header */}
      <View style={styles.topicHeader}>
        <View style={styles.topicNumberContainer}>
          <Text style={styles.topicNumber}>
            {totalCount - index}
          </Text>
        </View>
        <Text style={[
          styles.topicTitle,
          isCompletionTopic && styles.doneTopicTitle
        ]}>
          {topic.replace('research_done', 'Research Complete')}
        </Text>
      </View>
      
      {/* Status Badge */}
      {isCompletionTopic ? (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.statusBadgeDone}
        >
          <MaterialIcons name="done-all" size={14} color="#fff" />
          <Text style={styles.statusTextDone}>Research Complete</Text>
        </MotiView>
      ) : isActive ? (
        <MotiView
          from={{ opacity: 0.7, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: 'timing',
            loop: true,
            repeatReverse: true,
            duration: 1500
          }}
          style={styles.statusBadgeActive}
        >
          <MaterialIcons name="sync" size={14} color="#fff" />
          <Text style={styles.statusTextActive}>Researching</Text>
        </MotiView>
      ) : (
        <View style={styles.statusBadgeComplete}>
          <MaterialIcons name="check-circle" size={14} color="#fff" />
          <Text style={styles.statusTextComplete}>Completed</Text>
        </View>
      )}
      
      {/* Source Links - Only show for non-system cards */}
      {!isSystemCard && links && links.length > 0 && (
        <View style={styles.sourcesSection}>
          <View style={styles.sourcesHeader}>
            <MaterialIcons name="link" size={14} color="#94a3b8" />
            <Text style={styles.sourcesTitle}>
              Sources ({links.length})
            </Text>
          </View>
          {renderSourceLinks()}
        </View>
      )}
      
      {/* Creation Time */}
      {createdAt && (
        <Text style={styles.topicTime}>
          {new Date(createdAt).toLocaleTimeString()}
        </Text>
      )}
    </MotiView>
  );
};

const styles = StyleSheet.create({
  topicCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  activeTopicCard: {
    borderLeftColor: '#8B5CF6',
    backgroundColor: '#1e293b',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  doneTopicCard: {
    borderLeftColor: '#10B981',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicNumberContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  topicNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
    textAlign: 'center',
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    flex: 1,
  },
  doneTopicTitle: {
    color: '#10B981',
  },
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 4,
  },
  statusBadgeComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusTextComplete: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 4,
  },
  statusBadgeDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusTextDone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  sourcesSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    marginLeft: 4,
  },
  sourcesContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  sourceLinkText: {
    fontSize: 13,
    color: '#e2e8f0',
    marginLeft: 8,
    flex: 1,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(99, 102, 241, 0.5)',
  },
  topicTime: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
});

export default TopicCard; 
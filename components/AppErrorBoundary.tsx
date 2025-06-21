import React, { Component, ErrorInfo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { handleGlobalError, errorHandler, ErrorCategory, ErrorSeverity } from '../utils/errorHandler';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  detailsVisible: boolean;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      detailsVisible: false,
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use our centralized error handling system
    handleGlobalError(error, errorInfo.componentStack || 'Unknown component stack');
    
    // Log error to console
    console.error('Error caught by AppErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // Trigger haptic feedback to notify the user
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        .catch(() => {
          // Silently fail if haptics aren't available
        });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      detailsVisible: false,
    });
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      detailsVisible: !prevState.detailsVisible,
    }));
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, detailsVisible } = this.state;
      
      return (
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={['#0f172a', '#131c38', '#1a1f38']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.header}>
            <MaterialIcons name="error-outline" size={40} color="#f87171" />
            <Text style={styles.headerText}>Something went wrong</Text>
          </View>
          
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              The application has encountered an unexpected error. We apologize for the inconvenience.
            </Text>
            
            <Text style={styles.errorMessage}>
              {error?.toString() || 'Unknown error'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={this.toggleDetails}
          >
            <Text style={styles.detailsButtonText}>
              {detailsVisible ? 'Hide Technical Details' : 'Show Technical Details'}
            </Text>
            <Ionicons
              name={detailsVisible ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#94a3b8"
            />
          </TouchableOpacity>
          
          {detailsVisible && (
            <ScrollView style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Component Stack:</Text>
              <Text style={styles.detailsText}>
                {errorInfo?.componentStack || 'No stack trace available'}
              </Text>
            </ScrollView>
          )}
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={this.resetError}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resetButtonGradient}
              >
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.resetButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 16,
  },
  messageContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#f87171',
    textAlign: 'center',
    padding: 16,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 8,
  },
  detailsContainer: {
    marginHorizontal: 24,
    marginVertical: 16,
    maxHeight: 200,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsContainer: {
    marginTop: 'auto',
    padding: 24,
  },
  resetButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default AppErrorBoundary;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

/**
 * A simple test screen with minimal dependencies to verify basic app functionality
 */
const SimpleTestScreen = () => {
  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Test Screen
        </Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          App is loading correctly!
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={toggleTheme}
        >
          <Text style={styles.buttonText}>Toggle Theme</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.accent, marginTop: 12 }]}
          onPress={() => navigation.navigate('TestN8nWebhook')}
        >
          <Text style={styles.buttonText}>Go to N8n Test Screen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimpleTestScreen; 
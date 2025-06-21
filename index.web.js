/**
 * Web-specific entry point to handle React DOM initialization properly
 */

// Polyfill for String.S which is causing the error
if (String.S === undefined) {
  Object.defineProperty(String, 'S', {
    get: function() {
      console.warn('Accessing String.S which was undefined - using polyfill');
      return '';
    }
  });
}

// Standard imports
import { registerRootComponent } from 'expo';
import App from './App';

// Register the root component as usual
registerRootComponent(App); 
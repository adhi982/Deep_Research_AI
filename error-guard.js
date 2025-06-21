/**
 * UNUSED - KEPT FOR REFERENCE ONLY
 * 
 * This file has been disabled as it was causing bundling issues.
 * The functionality has been simplified in App.tsx instead.
 */

import React from 'react';

/**
 * Simple error guard utilities for React Native
 * Simplified version to avoid bundling issues
 */

// Safely access a property from an object, even if the property path doesn't exist
export function safelyAccessProperty(obj, path, defaultValue = null) {
  if (!obj) return defaultValue;
  
  const parts = typeof path === 'string' ? path.split('.') : path;
  
  let result = obj;
  for (let i = 0; i < parts.length; i++) {
    if (result === undefined || result === null) {
      return defaultValue;
    }
    result = result[parts[i]];
  }
  
  return result !== undefined ? result : defaultValue;
}

// Safeguard for array operations
export function safelyAccessArray(arr, index, defaultValue = null) {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index];
}

// Safeguard for function calls
export function safelyCallFunction(fn, ...args) {
  if (typeof fn !== 'function') return null;
  try {
    return fn(...args);
  } catch (error) {
    console.error('Error calling function:', error);
    return null;
  }
}

// Apply patches to prevent common errors
function applyPatches() {
  try {
    // Patch various String prototype methods to handle null/undefined
    // This specifically prevents "Cannot read property 'S' of undefined" errors
    if (typeof String.prototype !== 'undefined') {
      // Cache original methods
      const originalMethods = {
        split: String.prototype.split,
        charAt: String.prototype.charAt,
        charCodeAt: String.prototype.charCodeAt,
        concat: String.prototype.concat,
        indexOf: String.prototype.indexOf,
        lastIndexOf: String.prototype.lastIndexOf,
        match: String.prototype.match,
        replace: String.prototype.replace,
        search: String.prototype.search,
        slice: String.prototype.slice,
        substring: String.prototype.substring,
        toLowerCase: String.prototype.toLowerCase,
        toUpperCase: String.prototype.toUpperCase,
        trim: String.prototype.trim
      };
      
      // Override String.prototype.split
      if (!String.prototype._original_split) {
        String.prototype._original_split = originalMethods.split;
        String.prototype.split = function(separator, limit) {
          if (this === null || this === undefined) {
            console.warn('Attempted to call split on null or undefined');
            return [];
          }
          return String.prototype._original_split.call(this, separator, limit);
        };
      }
      
      // Override String.prototype.charAt
      if (!String.prototype._original_charAt) {
        String.prototype._original_charAt = originalMethods.charAt;
        String.prototype.charAt = function(pos) {
          if (this === null || this === undefined) {
            console.warn('Attempted to call charAt on null or undefined');
            return '';
          }
          return String.prototype._original_charAt.call(this, pos);
        };
      }
      
      // Monkeypatch String object itself to handle the 'S' property access
      // This is addressing the specific error in the stack trace
      const originalString = global.String;
      global.String = function(val) {
        if (val === undefined || val === null) {
          console.warn('Attempting to convert undefined/null to string');
          return originalString('');
        }
        return originalString(val);
      };
      
      // Copy all properties from the original String
      Object.setPrototypeOf(global.String, originalString);
      Object.getOwnPropertyNames(originalString).forEach(prop => {
        if (prop !== 'prototype' && prop !== 'name' && prop !== 'length') {
          global.String[prop] = originalString[prop];
        }
      });
      
      // Special handling for 'S' property that's causing the error
      Object.defineProperty(global.String, 'S', {
        get: function() {
          console.warn('Accessing String.S property which might be undefined');
          return originalString.S || '';
        }
      });
    }
    
    // Add more patches here for other common errors
    
  } catch (error) {
    console.error('Error applying patches:', error);
  }
}

// Apply patches immediately
applyPatches();

// Simple error guard HOC for React components
export function withErrorGuard(Component) {
  return function ErrorGuardedComponent(props) {
    try {
      return React.createElement(Component, props);
    } catch (error) {
      console.error('Error in component:', error);
      return null;
    }
  };
}

export default {
  safelyAccessProperty,
  safelyAccessArray,
  safelyCallFunction,
  withErrorGuard
}; 
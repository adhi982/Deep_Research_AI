import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

// Import Three.js dependencies with error handling
let THREE: any = null;
let GLView: any = null;
let Renderer: any = null;

// Flag to track if 3D is available
let is3DAvailable = true;
// Store error message for debugging
let errorMessage = "";

try {
  // Import THREE core - using direct import instead of file path
  THREE = require('three');
  
  // Import expo-gl
  const expoGL = require('expo-gl');
  GLView = expoGL.GLView;
  console.log('GLView loaded:', !!GLView);
  
  // Import expo-three components
  const expoThree = require('expo-three');
  Renderer = expoThree.Renderer;
  console.log('Renderer loaded:', !!Renderer);
  
  console.log('All 3D dependencies loaded successfully');
} catch (err: any) {
  errorMessage = err.toString();
  console.error('Error loading 3D dependencies:', err);
  is3DAvailable = false;
}

// Define this globally so we can access it across the component
let triggerGetStartedAnimation: () => void = () => {
  console.log('Animation not yet initialized');
};

// Type for label data
type LabelData = {
  node: any;
  text: string;
  position: {x: number, y: number, z: number};
  opacity: number;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [getStartedVisible, setGetStartedVisible] = useState(true);
  const [is3DWorking, setIs3DWorking] = useState(is3DAvailable);
  const [errorDetails, setErrorDetails] = useState(errorMessage);
  // Reference to hold all label data for rendering in React Native
  const [labels, setLabels] = useState<LabelData[]>([]);
  
  // Reset the Get Started button when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Show the Get Started button when returning to this screen
      setGetStartedVisible(true);
      return () => {
        // Cleanup function (if needed)
      };
    }, [])
  );
  
  const navigateToDashboard = () => {
    // First trigger the animation by simulating Get Started button click
    // This will call the animation code directly from home_1.html
    triggerGetStartedAnimation();
    
    // Hide the button
    setGetStartedVisible(false);
    
    // Then navigate after animation completes
    setTimeout(() => {
    navigation.navigate('Dashboard');
    }, 1500);
  };
  
  const navigateToLogin = () => {
    navigation.navigate('Login');
  };
  
  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  // Install dependencies on first mount
  useEffect(() => {
    // Check if required packages are installed
    if (!is3DAvailable) {
      Alert.alert(
        "3D Visualization Unavailable",
        "Required packages may be missing. Please install: three, expo-gl, expo-three",
        [
          { 
            text: "OK", 
            onPress: () => console.log("OK Pressed") 
          }
        ]
      );
    }
  }, []);
  
  // This function will hold the entire home_1.html implementation
  // It will be called when the component mounts
  const setupThreeJSVisualization = (gl: any) => {
    try {
      console.log('Setting up Three.js visualization...');
      // AI related terms organized for better mobile distribution
      const aiTerms: string[][] = [
    // Layer 1: Core ML Concepts (fewer items for closer to center)
    ["Neural-Networks", "Backpropagation", "Gradient-Descent"],
    // Layer 2: Model Architectures
    ["Transformer", "LSTM", "GAN", "CNN", "RNN"],
    // Layer 3: Training Techniques
    ["Fine-Tuning", "Transfer-Learning", "Embeddings", "Tokenization", "Dropout", "Regularization"],
    // Layer 4: Applications & Specialized Areas
    ["Diffusion-Models", "Reinforcement-Learning", "NLP", "Computer-Vision", "RLHF", "Object-Detection"],
    // Layer 5: Tools & Infrastructure (fewer items for better visibility)
    ["Vector-DB", "PyTorch", "TensorFlow", "GPT", "LLM", "RAG"]
  ];

      // Set up the scene
      const scene = new THREE.Scene();
      console.log('Scene created:', !!scene);
      scene.background = new THREE.Color(0x000814); // Very dark navy background
  
  // Colors for navy blue theme
  const PRIMARY_COLOR = 0x1E3A8A; // Deep navy blue
  const SECONDARY_COLOR = 0x3B82F6; // Brighter navy blue for highlights
  const TERTIARY_COLOR = 0x0C1E4A; // Very dark navy for secondary connections
  
      // Set up the camera - adjusted for mobile view
      const camera = new THREE.PerspectiveCamera(
        70, 
        gl.drawingBufferWidth / gl.drawingBufferHeight, 
        0.1, 
        1000
      );
      // Start at the closest zoom level
      camera.position.z = 50; 
      
      // Set up the renderer
      const renderer = new Renderer({ gl });
      console.log('Renderer created:', !!renderer);
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000814);
      
      // Create the central node
      const centralGeometry = new THREE.SphereGeometry(4, 32, 32);
      const centralMaterial = new THREE.MeshBasicMaterial({ color: SECONDARY_COLOR });
      const centralNode = new THREE.Mesh(centralGeometry, centralMaterial);
      scene.add(centralNode);
      
      // Network nodes and connections
      const nodes: any[] = [];
      const connections: any[] = [];
      const nodeLabels: any[] = [];
      const nodeMaterial = new THREE.MeshBasicMaterial({ color: PRIMARY_COLOR });
      const highlightNodeMaterial = new THREE.MeshBasicMaterial({ color: SECONDARY_COLOR });

  // Function to create a node in a structured position optimized for mobile
      function createNode(layer: number, indexInLayer: number, totalInLayer: number) {
    // Adjust node size - smaller for mobile
    const nodeGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const node = new THREE.Mesh(nodeGeometry, layer === 0 ? highlightNodeMaterial : nodeMaterial);
    
    // Mobile-optimized positioning - tighter layers with more vertical distribution
    const isPortrait = Dimensions.get('window').height > Dimensions.get('window').width;
    const aspectRatio = Dimensions.get('window').width / Dimensions.get('window').height;
    
    // Layer distances adjusted for mobile view (more compressed for portrait)
    const layerDistances = isPortrait 
      ? [30, 55, 80, 105, 130] 
      : [40, 70, 100, 130, 160];
    const distance = layerDistances[layer];
    
    // Calculate position - distribute more evenly in the available space
    const angleStep = (2 * Math.PI) / totalInLayer;
    const angle = indexInLayer * angleStep;
    
    // Adjust Y position based on screen orientation
    const yScale = isPortrait ? 0.6 : 1.0;
    const yVariation = (15 - (layer * 5)) * yScale;
    
    node.position.x = distance * Math.cos(angle) * aspectRatio;
    node.position.y = (yVariation * Math.sin(angle * 2) + (layer * 3 - 6)) * yScale;
    node.position.z = distance * Math.sin(angle);
    
    // Add structured movement data
    node.userData = {
      velocity: new THREE.Vector3(
        Math.cos(angle) * 0.02,
        Math.sin(angle * 2) * 0.01,
        Math.sin(angle) * 0.02
      ),
      originalPosition: node.position.clone(),
      layer: layer,
      angle: angle,
      distance: distance,
      aspectRatio: aspectRatio,
      isPortrait: isPortrait
    };
    
    return node;
      }

  // Function to create a more structured connection between two points
      function createConnection(start: any, end: any, isPrimaryConnection = false) {
    const points = [];
    points.push(start.clone());
    
    // Create a more controlled curve
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    // Add a slight deviation based on distance - less curve for mobile
    const distance = start.distanceTo(end);
    const deviation = distance * 0.1; // Reduced curve for cleaner mobile look
    
    // Calculate a perpendicular direction for the curve to bend
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const perpendicular = new THREE.Vector3(direction.y, -direction.x, 0).normalize();
    
    // Apply deviation
    midPoint.add(perpendicular.multiplyScalar(deviation));
    
    points.push(midPoint);
    points.push(end.clone());
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
        // Different material for connections - now with navy blue theme
    const material = new THREE.LineBasicMaterial({ 
      color: isPrimaryConnection ? SECONDARY_COLOR : TERTIARY_COLOR,
      transparent: true,
      opacity: isPrimaryConnection ? 0.8 : 0.5
    });
    
    const line = new THREE.Line(geometry, material);
    
    // Add animation data
    line.userData = {
      startPoint: start,
      endPoint: end,
      midPoint: midPoint,
      originalMidPoint: midPoint.clone(),
      time: Math.random() * 100,
      isPrimary: isPrimaryConnection
    };
    
    return line;
      }

      // Create text label for a node - in React Native we just store reference data
      function createLabel(node: any, text: string) {
        return {
      node: node,
      text: text,
          position: new THREE.Vector3(),
          opacity: 0.9 // Default opacity
        };
      }

      // Initialize the network with structured layout optimized for mobile
      function initNetwork() {
        console.log('Initializing network...');
        // Clear any existing nodes
        nodes.length = 0;
        connections.length = 0;
        nodeLabels.length = 0;
        
        // Remove existing elements from scene
        while(scene.children.length > 1) { // Keep the central node
          const object = scene.children[1];
          scene.remove(object);
        }
        
        let nodeIndex = 0;
        
        // Create nodes in layers
        aiTerms.forEach((layerTerms, layerIndex) => {
          const nodesInLayer = layerTerms.length;
          
          layerTerms.forEach((term, indexInLayer) => {
            const node = createNode(layerIndex, indexInLayer, nodesInLayer);
            scene.add(node);
            nodes.push(node);
            
            // Create primary connection to center for first layer
            if (layerIndex === 0) {
              const connection = createConnection(centralNode.position, node.position, true);
              scene.add(connection);
              connections.push(connection);
            }
            
            // Connect to a node in the previous layer (hierarchical structure)
            // More structured connections for mobile - connect to closest node in previous layer
            if (layerIndex > 0) {
              const prevLayerStartIndex = aiTerms.slice(0, layerIndex).flat().length - aiTerms[layerIndex-1].length;
              // Find the node in previous layer with closest angle
              const prevLayerSize = aiTerms[layerIndex-1].length;
              const angleRatio = prevLayerSize / nodesInLayer;
              const closestPrevIndex = Math.floor(indexInLayer * angleRatio) % prevLayerSize;
              
              const prevLayerNodeIndex = prevLayerStartIndex + closestPrevIndex;
              const connection = createConnection(nodes[prevLayerNodeIndex].position, node.position, true);
              scene.add(connection);
              connections.push(connection);
            }
            
            // Create label
            const label = createLabel(node, term);
            nodeLabels.push(label);
            
            nodeIndex++;
          });
        });
        
        // Create connections between adjacent nodes in the same layer for a cleaner look
        for (let layerIndex = 0; layerIndex < aiTerms.length; layerIndex++) {
          const layerSize = aiTerms[layerIndex].length;
          const startNodeIndex = aiTerms.slice(0, layerIndex).flat().length;
          
          // Connect each node only to its immediate neighbors for mobile (cleaner look)
          for (let i = 0; i < layerSize; i++) {
            const nextIndex = (i + 1) % layerSize;
            const connection = createConnection(
              nodes[startNodeIndex + i].position, 
              nodes[startNodeIndex + nextIndex].position
            );
            scene.add(connection);
            connections.push(connection);
            
            // Fewer cross connections for mobile - only add a few strategic ones
            if (layerSize > 5 && i % 3 === 0) {
              const skipIndex = (i + Math.floor(layerSize/2)) % layerSize;
              const crossConnection = createConnection(
                nodes[startNodeIndex + i].position, 
                nodes[startNodeIndex + skipIndex].position
              );
              scene.add(crossConnection);
              connections.push(crossConnection);
            }
          }
        }
        console.log(`Network initialized: ${nodes.length} nodes, ${connections.length} connections`);
      }

      // Update the animation with more structured movement
      function updateNetwork(time: number) {
        // Update nodes with orbital movement - gentler for mobile
        nodes.forEach(node => {
          const userData = node.userData;
          // Slower movement for mobile - less dizzying
          const orbitSpeed = 0.0002 * (5 - userData.layer) * 0.5;
          
          // Update the angle for orbital movement
          userData.angle += orbitSpeed;
          
          // Calculate new position based on orbital movement
          const distance = userData.distance + Math.sin(time * 0.0008) * 2; // Subtle breathing effect
          
          const newPos = new THREE.Vector3(
            distance * Math.cos(userData.angle) * userData.aspectRatio,
            userData.originalPosition.y + Math.sin(time * 0.0004 + userData.layer) * 2,
            distance * Math.sin(userData.angle)
          );
          
          // Smoother transitions
          node.position.lerp(newPos, 0.02);
        });
        
        // Update connections with subtle data flow effect
        connections.forEach(connection => {
          const userData = connection.userData;
          
          // Update the mid point with controlled flow effect
          userData.time += userData.isPrimary ? 0.05 : 0.03; // Slower for mobile
          
          // Calculate a perpendicular direction for the curve oscillation
          const direction = new THREE.Vector3().subVectors(
            userData.endPoint, 
            userData.startPoint
          ).normalize();
          const perpendicular = new THREE.Vector3(direction.y, -direction.x, 0).normalize();
          
          // Subtle pulse effect - reduced for mobile
          const pulse = Math.sin(userData.time * 0.15) * 2;
          userData.midPoint.copy(userData.originalMidPoint).add(
            perpendicular.multiplyScalar(pulse)
          );
          
          // Data flow effect
          const flowSpeed = 0.06; // Slower for mobile
          const flowAmplitude = userData.isPrimary ? 0.2 : 0.1; // Subtler for mobile
          connection.material.opacity = 0.4 + Math.sin(userData.time * flowSpeed) * flowAmplitude;
          
          // Update geometry with smoother transitions
          const points = [
            userData.startPoint.clone(),
            userData.midPoint.clone(),
            userData.endPoint.clone()
          ];
          
          connection.geometry.setFromPoints(points);
          connection.geometry.attributes.position.needsUpdate = true;
        });
        
        // Update labels - Convert 3D positions to screen coordinates
        const updatedLabels: LabelData[] = [];
        
        nodeLabels.forEach(label => {
          // Project the 3D position to screen coordinates
          const pos = label.node.position.clone();
          pos.project(camera);
        
        // Convert to CSS coordinates
          const width = Dimensions.get('window').width;
          const height = Dimensions.get('window').height;
          const x = (pos.x * 0.5 + 0.5) * width;
          const y = (-(pos.y * 0.5) + 0.5) * height;
          
          // Hide if behind the camera or too far to the edge
          const opacity = pos.z > 1 || Math.abs(pos.x) > 1.1 || Math.abs(pos.y) > 1.1
            ? 0
            : 0.9;
          
          updatedLabels.push({
            node: label.node,
            text: label.text,
            position: { x, y, z: pos.z },
            opacity
          });
        });
        
        // Update state with new label positions
        setLabels(updatedLabels);
      }

      // Modified camera movement to start from closest zoom and zoom out
      function updateCamera(time: number) {
        const speed = 0.0005; // Slower for mobile
        const radius = 12;
        const height = 6;
        
        // Define the zoom range: start at closest (50) and zoom out to farthest (200)
        const minZ = 50; // Closest zoom level
        const maxZ = 200; // Farthest zoom level
        const zoomRange = maxZ - minZ;
        
        // Use a sine wave to control the zoom, but invert the phase to start at closest
        const zoomProgress = Math.sin(time * speed); // Ranges from -1 to 1
        const normalizedZoom = (zoomProgress + 1) / 2; // Ranges from 0 to 1
        const zOffset = minZ + normalizedZoom * zoomRange; // Ranges from 50 to 200
        
        // Gentler elliptical movement, now zooming out from closest to farthest
        camera.position.x = Math.sin(time * speed) * radius;
        camera.position.y = Math.sin(time * speed * 0.4) * height + 4;
        camera.position.z = zOffset; // Zoom out from 50 to 200
        
        camera.lookAt(0, 0, 0);
      }

      // This is our get started animation handler from the original website
      // But adapted for React Native
      const getStartedHandler = () => {
        console.log('Get Started animation triggered');
        // Move all nodes to the center initially
        nodes.forEach((node) => {
          // Store the target position (original structured position)
          const targetPos = node.position.clone();

          // Set the node's initial position to the center
          node.position.copy(centralNode.position);

          // Scale nodes down to make them invisible initially
          node.scale.set(0.01, 0.01, 0.01);

          // Animate nodes expanding outward from the center
          const nodeTween = {
            startTime: Date.now(),
            duration: 400, // Duration for the expansion
            startPos: centralNode.position.clone(),
            targetPos: targetPos,
            startScale: 0.01,
            targetScale: 1.0,
          };

          function animateNodeExpansion() {
            const now = Date.now();
            const elapsed = now - nodeTween.startTime;
            const progress = Math.min(elapsed / nodeTween.duration, 1);

            // Smooth easing for expansion
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Move the node outward from the center
            node.position.lerpVectors(nodeTween.startPos, nodeTween.targetPos, easeProgress);

            // Scale the node up to its full size
            const currentScale = nodeTween.startScale + (nodeTween.targetScale - nodeTween.startScale) * easeProgress;
            node.scale.set(currentScale, currentScale, currentScale);

            if (progress < 1) {
              requestAnimationFrame(animateNodeExpansion);
            }
          }

          animateNodeExpansion();
        });

        // Fade in connections after nodes start expanding
        connections.forEach((connection) => {
          // Start with invisible connections
          connection.material.opacity = 0;

          // Animate the connections fading in
          const connectionTween = {
            startTime: Date.now(),
            duration: 1200, // Duration for the fade-in
            startOpacity: 0,
            targetOpacity: connection.userData.isPrimary ? 0.8 : 0.5,
          };

          function animateConnectionFadeIn() {
            const now = Date.now();
            const elapsed = now - connectionTween.startTime;
            const progress = Math.min(elapsed / connectionTween.duration, 1);

            // Smooth fade-in effect
            connection.material.opacity =
              connectionTween.startOpacity + (connectionTween.targetOpacity - connectionTween.startOpacity) * progress;

            if (progress < 1) {
              requestAnimationFrame(animateConnectionFadeIn);
            }
          }

          animateConnectionFadeIn();
        });

        // Add a slight pulse effect to the central node
        centralNode.scale.set(1.5, 1.5, 1.5); // Start larger

        const centralNodePulse = {
          startTime: Date.now(),
          duration: 800,
        };

        function animateCentralNodePulse() {
          const now = Date.now();
          const elapsed = now - centralNodePulse.startTime;
          const progress = Math.min(elapsed / centralNodePulse.duration, 1);

          // Pulse effect: overshoot and settle
          const scale = progress < 0.5
            ? 1.5 - (progress / 0.5) * 0.5 // Contract from 1.5x to 1.0x
            : 1.0 + ((progress - 0.5) / 0.5) * 0.1; // Slight overshoot to 1.1x

          centralNode.scale.set(scale, scale, scale);

          if (progress < 1) {
            requestAnimationFrame(animateCentralNodePulse);
          } else {
            centralNode.scale.set(1, 1, 1); // Settle at normal size
          }
        }

        animateCentralNodePulse();
      };

      // Initialize the network
      initNetwork();

      // Animation loop
      function animate(time: number) {
        requestAnimationFrame(animate);
        updateNetwork(time);
        updateCamera(time);
        renderer.render(scene, camera);
      }

      animate(0);
      
      // Handle orientation changes in React Native
      Dimensions.addEventListener('change', () => {
        const { width, height } = Dimensions.get('window');
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        initNetwork(); // Rebuild network for new orientation
      });
      
      // Update the global triggerGetStartedAnimation function to use our handler
      triggerGetStartedAnimation = getStartedHandler;
      
      // Return the ref for cleanup
      return {
        dispose: () => {
          // Clean up all Three.js resources
          scene.dispose();
          renderer.dispose();
        }
      };
    } catch (err: any) {
      const errMsg = err.toString();
      console.error('Error setting up Three.js visualization:', errMsg);
      setErrorDetails(errMsg);
      return null;
    }
  };

  // Handle GL view context creation
  const onContextCreate = (gl: any) => {
    try {
      console.log('GL context created');
      // Call our setup function and get the ref for cleanup
      const threeRef = setupThreeJSVisualization(gl);
  
  // Clean up on unmount
    return () => {
        if (threeRef && threeRef.dispose) {
          threeRef.dispose();
        }
      };
    } catch (error: any) {
      const errMsg = error.toString();
      console.error('Error in onContextCreate:', errMsg);
      setErrorDetails(errMsg);
      setIs3DWorking(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Top Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          {/* Removed "AI Network" text */}
        </View>
        <TouchableOpacity onPress={navigateToProfile} style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content with Three.js Visualization */}
      <View style={styles.container}>
        {is3DWorking && GLView ? (
          <GLView
            style={styles.three}
            onContextCreate={onContextCreate}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              3D visualization unavailable
            </Text>
            <Text style={styles.errorText}>
              {errorDetails ? `Error: ${errorDetails}` : 'Please install required dependencies: three, expo-gl, expo-three'}
            </Text>
            <TouchableOpacity 
              style={styles.installButton}
              onPress={() => Alert.alert(
                "Install Required Packages",
                "Run these commands:\n\nnpm install three expo-gl expo-three",
                [{ text: "OK" }]
              )}
            >
              <Text style={styles.installButtonText}>Show Installation Instructions</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Labels overlay for 3D nodes */}
        <View style={styles.labelsContainer} pointerEvents="none">
          {labels.map((label, index) => (
            <Text
              key={`label-${index}`}
              style={[
                styles.label,
                {
                  left: label.position.x,
                  top: label.position.y,
                  opacity: label.opacity,
                  transform: [{ translateX: -50 }, { translateY: -50 }]
                }
              ]}
            >
              {label.text}
            </Text>
          ))}
        </View>
        
        {/* Get Started Button */}
        {getStartedVisible && (
          <View style={styles.getStartedButtonContainer}>
            <TouchableOpacity 
              style={styles.getStartedButton} 
              onPress={navigateToDashboard}
            >
              <Text style={styles.getStartedButtonText}>GET STARTED</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Back to Login Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={navigateToLogin}
          activeOpacity={0.6}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000814' // Very dark navy background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    color: '#3B82F6', // Bright navy blue
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: '#3B82F6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  profileButton: {
    padding: 5
  },
  container: {
    flex: 1,
    position: 'relative'
  },
  three: {
    flex: 1
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000814',
    padding: 20
  },
  fallbackText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: '80%'
  },
  installButton: {
    backgroundColor: '#1E3A8A',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  installButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  labelsContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5
  },
  label: {
    position: 'absolute',
    color: '#3B82F6', // Bright navy blue
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    textShadowColor: '#3B82F6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
    textAlign: 'center',
    backgroundColor: 'transparent',
    padding: 2
  },
  getStartedButtonContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  getStartedButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#1E3A8A', // Deep navy blue
    borderRadius: 30,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 5,
  },
  getStartedButtonText: {
    color: '#3B82F6', // Bright navy blue
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    textShadowColor: '#3B82F6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  backButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    padding: 15,
    zIndex: 120, // Higher zIndex to ensure it's above other elements
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  }
});
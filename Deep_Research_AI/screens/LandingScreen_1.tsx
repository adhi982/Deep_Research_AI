import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, StatusBar, Platform, ScrollView, ActivityIndicator, Animated, Easing, TextInput, KeyboardAvoidingView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { MotiView } from 'moti';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { generateUserId } from '../utils/supabase';
import { useUser } from '../context/UserContext';

// Import Three.js dependencies with error handling
let THREE: any = null;
let Renderer: any = null;
let GLView: any = null;
let Asset: any = null;
let gsap: any = null;

// Flag to track if 3D is available
let is3DAvailable = true;

try {
  // Import THREE core
  THREE = require('three');
  console.log('THREE version:', THREE.REVISION);
  
  // Import expo-three components
  const expoThree = require('expo-three');
  Renderer = expoThree.Renderer;
  console.log('Renderer loaded:', !!Renderer);
  
  // Import expo-gl
  const expoGL = require('expo-gl');
  GLView = expoGL.GLView;
  console.log('GLView loaded:', !!GLView);
  
  // Import expo-asset
  const expoAsset = require('expo-asset');
  Asset = expoAsset.Asset;
  
  // Import GSAP for animations - properly destructure the gsap object
  const gsapModule = require('gsap');
  gsap = gsapModule.default || gsapModule;
  
  // Check if gsap is an object and has the expected methods
  if (gsap) {
    console.log('GSAP loaded type:', typeof gsap);
    console.log('GSAP methods:', Object.keys(gsap).join(', '));
    
    // Check specific methods we need
    console.log('GSAP to method:', typeof gsap.to);
    console.log('GSAP timeline method:', typeof gsap.timeline);
    
    // Log if we need to use fallback
    if (typeof gsap.to !== 'function') {
      console.warn('GSAP.to is not a function, will use fallback animations');
    }
    
    if (typeof gsap.timeline !== 'function') {
      console.warn('GSAP.timeline is not a function, will use fallback or direct animations');
    }
  } else {
    console.warn('GSAP is not properly loaded, will use fallback animations');
  }
  
  console.log('All 3D dependencies loaded successfully');
} catch (err) {
  console.error('Error loading 3D dependencies:', err);
  is3DAvailable = false;
}

// AI terminology array for holographic text (from index.html)
const AI_TERMS = [
  "AI", "AGI", "ML", "DL", "Neural", "DeepThink", "Singularity", "Cognition",
  "Superintelligence", "Algorithm", "Autonomy", "Computing", "Reasoning", 
  "Cognitive", "Quantum", "Reinforcement", "Neurosymbolic", "Cybernetics", 
  "Inference", "Optimization", "Architecture", "Federated", "Distributed", 
  "Evolutionary", "Bayesian", "Swarm", "Fuzzy", "Generative", "Transformer", 
  "Symbolic", "Neuroscience", "Technological", "Parallel", "Augmented", 
  "Semantic", "Pattern", "Hyperparameter", "Autonomous", "Self-Learning", 
  "Reasoning", "Computational", "Embedded", "Probabilistic", "Swarm", 
  "Recognition", "Explainable", "Cognition", "Optimization", "Architecture", 
  "Meta-Learning", "Neuromorphic"
];

// Animation configuration (from index.html)
const CONFIG = {
  NODE_COUNT: 120,
  COLORS: {
    NODE_CORE: '#f5f5f5',               // Soft White
    NODE_GLOW: 'rgba(255, 255, 255, 0.2)', // Soft White (Data Pulses)
    NODE_PULSE: 'rgba(255, 255, 255, 0.95)',
    CONNECTION: '#4DB6AC',              // Changed back to original teal color
    PACKET: '#4CAF50',                  // Soft Green (data packets)
    BACKGROUND: '#000000',              // Deep Space Black
    TEXT: '#4DB6AC'                     // Match text to connections
  },
  MOVEMENT: {
    SCROLL_SENSITIVITY: 0.00015,
    PACKET_SPEED: 0.0056,               // Reduced by 30% from 0.008
    BLINK_FREQUENCY: 8,
    PULSE_INTERVAL: 2000
  },
  STRUCTURE: {
    CORE_RADIUS: 25,
    LAYER_COUNT: 3,
    RANDOMNESS: 0.4,
    MIN_CONNECTIONS: 3,  // Minimum connections per node
    CONNECTION_DISTANCE: 20,  // Maximum distance for connections
    PACKET_REDUCTION: 0.3  // 30% reduction of packets
  },
  TEXT: {
    SIZE: 0.8,
    HEIGHT: 0.1,
    FADE_DURATION: 2.0,
    DISTANCE: 2.5  // Distance from node
  }
};

// Add a fallback animation utility at the top of the file after the imports
// Simple animation utility as fallback if GSAP isn't working
const animateValue = (
  obj: any, 
  property: string, 
  start: number, 
  end: number, 
  duration: number, 
  onComplete?: () => void
) => {
  const startTime = Date.now();
  
  // Create a function that will be called every frame
  const animate = () => {
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Set the current value based on progress
    const currentValue = start + progress * (end - start);
    
    // Set nested properties if needed (e.g. "scale.x")
    if (property.includes('.')) {
      const props = property.split('.');
      let target = obj;
      for (let i = 0; i < props.length - 1; i++) {
        target = target[props[i]];
      }
      target[props[props.length - 1]] = currentValue;
    } else {
      obj[property] = currentValue;
    }
    
    // Continue animation or complete
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  // Start the animation
  requestAnimationFrame(animate);
};

// Helper function to create text texture (works in React Native environment)
const createTextTexture = (text: string) => {
  // Reference dimensions for the sprite
  const width = text.length * 20;
  const height = 32;
  
  // Escape special characters for XML
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // This is a simple data URI representing the term in teal color
  // In a real implementation, this would be a more sophisticated SVG
  // but this simpler version works with React Native
  const dataURI = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="50%" y="50%" font-family="Arial" font-size="20" fill="${CONFIG.COLORS.TEXT.replace('#', '%23')}" text-anchor="middle" dominant-baseline="middle">${escapedText}</text></svg>`;

  // Create texture loader
  const loader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    loader.load(
      dataURI,
      (texture: any) => {
        resolve(texture);
      },
      undefined,
      (error: any) => {
        console.error('Error loading texture:', error);
        resolve(null);
      }
    );
  });
};

// Define THEME_COLORS here to be accessible by styles
const THEME_COLORS = {
  background: '#0A192F', // Dark Navy Blue
  cardBackground: 'rgba(25, 45, 65, 0.85)', // Translucent Dark Slate/Blue
  textPrimary: '#E5E5E5', // Off-white
  textSecondary: '#A0B1C8', // Lighter grey-blue
  accentPrimary: '#64FFDA', // Bright Teal/Cyan
  accentSecondary: '#4DB6AC', // Original Teal
  buttonText: '#FFFFFF',
  featureDescriptionYellow: '#FFE082', // Soft yellow for feature descriptions
};

const { width, height } = Dimensions.get('window');

// n8n webhook URL - for our enhanced landing screen
const WEBHOOK_URL = 'https://maga82834.app.n8n.cloud/webhook-test/38f01e92-c408-4589-a595-a366d31247aa';

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const glViewRef = useRef(null);
  const sceneRef = useRef<any>(null);
  const scrollY = useRef(0);
  const targetScrollY = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const nodesRef = useRef<any[]>([]);
  const connectionsRef = useRef<any[]>([]);
  const packetsRef = useRef<any[]>([]);
  const textObjectsRef = useRef<any[]>([]);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for the scrollable content
  const [showContent, setShowContent] = useState(true);
  const [isGlViewReady, setIsGlViewReady] = useState(false);
  const [is3DInitialized, setIs3DInitialized] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(is3DAvailable);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');
  const [layoutCalculated, setLayoutCalculated] = useState(false);
  
  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnimatedValue = useRef(new Animated.Value(0)).current;
  
  // Research parameters state
  const [query, setQuery] = useState('');
  const [breadth, setBreadth] = useState(3);
  const [depth, setDepth] = useState(3);
  const [includeTechnicalTerms, setIncludeTechnicalTerms] = useState(false);
  const [outputType, setOutputType] = useState('Research Paper');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  
  // Questions handling state
  const [questions, setQuestions] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [receivedQuestions, setReceivedQuestions] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  
  // Animation values
  const [breadthAnimValue] = useState(new Animated.Value(3));
  const [depthAnimValue] = useState(new Animated.Value(3));
  
  // Get user context
  const { userId } = useUser();
  
  // Update animation values when sliders change
  useEffect(() => {
    Animated.timing(breadthAnimValue, {
      toValue: breadth,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [breadth]);
  
  useEffect(() => {
    Animated.timing(depthAnimValue, {
      toValue: depth,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [depth]);
  
  const outputOptions = ['Research Paper', 'Blog', 'Essay', 'Case Study'];

  // Handle research submission
  const handleSubmitResearch = async () => {
    setIsLoading(true);
    
    try {
      // Use the global userId if available, otherwise fall back to generating one
      const userIdToUse = userId || await generateUserId();
      
      // Prepare the payload for the API call
      const payload = {
        user_id: userIdToUse,
        agent: 'general',
        query,
        breadth,
        depth,
        include_technical_terms: includeTechnicalTerms,
        output_format: outputType
      };
      
      console.log('Sending research query with payload:', payload);
      
      // Send to webhook
      const response = await axios.post(WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log('Research query successful!', response.data);
        
        // Check if the response contains questions
        if (response.data && Array.isArray(response.data.questions)) {
          const formattedQuestions = response.data.questions.map((q: string, index: number) => ({
            id: `q-${index}`,
            question: q,
            answer: ''
          }));
          setQuestions(formattedQuestions);
          setReceivedQuestions(true);
          setShowQuestionsModal(true);
          toast.success('Research query submitted successfully!');
        } else {
          toast.error('Received invalid response format from server');
        }
      } else {
        toast.error('Failed to submit research request. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleSubmitResearch:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle question answers submission
  const handleSubmitAnswers = async () => {
    // Check if all questions have answers
    const allAnswered = questions.every(q => q.answer.trim() !== '');
    
    if (!allAnswered) {
      toast.error('Please answer all questions before submitting');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userIdToUse = userId || await generateUserId();
      
      // Format answers for submission
      const answersPayload = {
        user_id: userIdToUse,
        answers: questions.map(q => ({
          question_id: q.id,
          question: q.question,
          answer: q.answer
        }))
      };
      
      console.log('Submitting answers:', answersPayload);
      
      // Send answers back to webhook
      const response = await axios.post(`${WEBHOOK_URL}/answers`, answersPayload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        toast.success('Answers submitted successfully!');
        setShowQuestionsModal(false);
      } else {
        toast.error('Failed to submit answers. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update a specific question's answer
  const updateQuestionAnswer = (id: string, answer: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, answer } : q
    ));
  };

  useEffect(() => {
    // Start auto-scroll for visual effect (matches the automatic motion in index.html)
    const autoScroll = () => {
      targetScrollY.current += 0.001;
    };
    
    const autoScrollInterval = setInterval(autoScroll, 16); // ~60fps
    
    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      
      if (pulseTimerRef.current) {
        clearInterval(pulseTimerRef.current);
      }
      
      clearInterval(autoScrollInterval);
    };
  }, []);

  // Neural Node class (adapted from index.html)
  class NeuralNode {
    mesh;
    glowMesh;
    group;
    isPulsing = false;
    baseScale;
    glowMaterial;
    connections = 0;
    
    constructor(position, scene) {
      // Create outer glow sphere (smaller radius)
      const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
      this.glowMaterial = new THREE.MeshBasicMaterial({
        color: CONFIG.COLORS.NODE_GLOW,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      this.glowMesh = new THREE.Mesh(glowGeometry, this.glowMaterial);
      
      // Main node geometry (smaller core)
      this.mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.25, 2),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(CONFIG.COLORS.NODE_CORE),
          emissive: new THREE.Color(CONFIG.COLORS.NODE_GLOW),
          emissiveIntensity: 0.7,
          metalness: 0.3, 
          roughness: 0.6,
          opacity: 1.0
        })
      );

      // Group for both meshes
      this.group = new THREE.Group();
      this.group.add(this.mesh);
      this.group.add(this.glowMesh);
      this.group.position.copy(position);
      
      // Add to scene
      scene.add(this.group);
      
      // Pulse state
      this.baseScale = new THREE.Vector3(1, 1, 1);
      this.mesh.scale.copy(this.baseScale);
    }
    
    pulse() {
      if (!this.isPulsing) {
        this.isPulsing = true;
        
        try {
          // Use direct GSAP animation instead of timeline if timeline isn't available
          if (typeof gsap.timeline !== 'function') {
            console.log('Using direct GSAP animations instead of timeline');
            
            // Animate emissiveIntensity
            gsap.to(this.mesh.material, {
              emissiveIntensity: 1.5,
              duration: 1.0,
              ease: "sine.inOut",
              onComplete: () => {
                gsap.to(this.mesh.material, {
                  emissiveIntensity: 0.7,
                  duration: 1.0,
                  ease: "sine.out"
                });
              }
            });
            
            // Animate glow opacity
            gsap.to(this.glowMaterial, {
              opacity: 0.8,
              duration: 0.8,
              ease: "sine.inOut",
              onComplete: () => {
                gsap.to(this.glowMaterial, {
                  opacity: 0.5,
                  duration: 1.2,
                  ease: "sine.out",
                  onComplete: () => {
                    this.isPulsing = false;
                  }
                });
              }
            });
            
            // Animate scale
            gsap.to(this.glowMesh.scale, {
              x: 1.2,
              y: 1.2,
              z: 1.2,
              duration: 0.8,
              ease: "sine.out",
              onComplete: () => {
                gsap.to(this.glowMesh.scale, {
                  x: 1.0,
                  y: 1.0,
                  z: 1.0,
                  duration: 1.2,
                  ease: "sine.inOut"
                });
              }
            });
          } else {
            // If timeline is available, use it as originally intended
            gsap.timeline()
              .to(this.mesh.material, {
                emissiveIntensity: 1.5,
                duration: 1.0,
                ease: "sine.inOut"
              })
              .to(this.mesh.material, {
                emissiveIntensity: 0.7,
                duration: 1.0,
                ease: "sine.out"
              });
            
            gsap.timeline()
              .to(this.glowMaterial, {
                opacity: 0.8,
                duration: 0.8,
                ease: "sine.inOut"
              })
              .to(this.glowMaterial, {
                opacity: 0.5,
                duration: 1.2,
                ease: "sine.out",
                onComplete: () => {
                  this.isPulsing = false;
                }
              });
            
            gsap.timeline()
              .to(this.glowMesh.scale, {
                x: 1.2, 
                y: 1.2, 
                z: 1.2,
                duration: 0.8,
                ease: "sine.out"
              })
              .to(this.glowMesh.scale, {
                x: 1.0, 
                y: 1.0, 
                z: 1.0,
                duration: 1.2,
                ease: "sine.inOut"
              });
          }
          
          // Create floating text async
          createFloatingText(this.group.position).catch(err => {
            console.error('Error creating floating text:', err);
          });
          
        } catch (error) {
          console.error('Error animating with GSAP, using fallback:', error);
          
          // Use fallback animation
          animateValue(this.mesh.material, 'emissiveIntensity', 0.7, 1.5, 1000, () => {
            animateValue(this.mesh.material, 'emissiveIntensity', 1.5, 0.7, 1000);
          });
          
          animateValue(this.glowMaterial, 'opacity', 0.5, 0.8, 800, () => {
            animateValue(this.glowMaterial, 'opacity', 0.8, 0.5, 1200, () => {
              this.isPulsing = false;
            });
          });
          
          animateValue(this.glowMesh.scale, 'x', 1.0, 1.2, 800, () => {
            animateValue(this.glowMesh.scale, 'x', 1.2, 1.0, 1200);
          });
          
          animateValue(this.glowMesh.scale, 'y', 1.0, 1.2, 800, () => {
            animateValue(this.glowMesh.scale, 'y', 1.2, 1.0, 1200);
          });
          
          animateValue(this.glowMesh.scale, 'z', 1.0, 1.2, 800, () => {
            animateValue(this.glowMesh.scale, 'z', 1.2, 1.0, 1200);
          });
          
          // Also try to create floating text in the fallback path
          createFloatingText(this.group.position).catch(err => {
            console.error('Error creating floating text in fallback:', err);
          });
        }
      }
    }
  }
  
  // Data Packet class (adapted from index.html)
  class DataPacket {
    mesh;
    start;
    end;
    progress;
    material;
    
    constructor(start, end, scene) {
      const geometry = new THREE.SphereGeometry(0.15, 8, 8);
      this.material = new THREE.MeshBasicMaterial({
        color: CONFIG.COLORS.PACKET,
        transparent: true
      });
      
      this.mesh = new THREE.Mesh(geometry, this.material);
      this.start = start.clone();
      this.end = end.clone();
      this.progress = Math.random();
      
      scene.add(this.mesh);
    }

    update() {
      this.progress = (this.progress + CONFIG.MOVEMENT.PACKET_SPEED) % 1;
      this.mesh.position.lerpVectors(this.start, this.end, this.progress);
      
      // Blinking effect
      this.material.opacity = Math.sin(this.progress * Math.PI) * 
                            Math.random() * 0.8 + 0.2;
    }
  }

  // Create floating text
  const createFloatingText = async (position) => {
    // Get random term from AI terms list
    const term = AI_TERMS[Math.floor(Math.random() * AI_TERMS.length)];
    console.log(`Creating floating text for term: ${term}`);
    
    if (!sceneRef.current?.scene) return;
    
    try {
      // Create texture for the text
      const texture = await createTextTexture(term);
      
      // Use material with the texture
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      
      // Create a sprite for the text
      const textSprite = new THREE.Sprite(material);
      
      // Scale based on text length
      const textScale = Math.max(2, term.length * 0.15);
      textSprite.scale.set(textScale, 0.8, 1);
      
      // Position slightly off from the node in a random direction
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(CONFIG.TEXT.DISTANCE);
      
      textSprite.position.copy(position).add(offset);
      
      // Store the term for display
      textSprite.userData = { term };
      
      // Add to scene and tracking array
      sceneRef.current.scene.add(textSprite);
      textObjectsRef.current.push(textSprite);
      
      try {
        // Use direct GSAP animation instead of timeline if timeline isn't available
        if (typeof gsap.timeline !== 'function') {
          // Fade in
          gsap.to(material, {
            opacity: 0.9,
            duration: CONFIG.TEXT.FADE_DURATION * 0.3,
            ease: "sine.in",
            onComplete: () => {
              // Fade out
              gsap.to(material, {
                opacity: 0,
                duration: CONFIG.TEXT.FADE_DURATION * 0.7,
                delay: 1.0,
                ease: "sine.out",
                onComplete: () => {
                  // Clean up
                  if (sceneRef.current?.scene) {
                    sceneRef.current.scene.remove(textSprite);
                    if (material.map) material.map.dispose();
                    material.dispose();
                    textObjectsRef.current = textObjectsRef.current.filter(obj => obj !== textSprite);
                  }
                }
              });
            }
          });
        } else {
          // If timeline is available, use it as originally intended
          gsap.timeline()
            .to(material, {
              opacity: 0.9,
              duration: CONFIG.TEXT.FADE_DURATION * 0.3,
              ease: "sine.in"
            })
            .to(material, {
              opacity: 0,
              duration: CONFIG.TEXT.FADE_DURATION * 0.7,
              delay: 1.0,
              ease: "sine.out",
              onComplete: () => {
                // Clean up
                if (sceneRef.current?.scene) {
                  sceneRef.current.scene.remove(textSprite);
                  if (material.map) material.map.dispose();
                  material.dispose();
                  textObjectsRef.current = textObjectsRef.current.filter(obj => obj !== textSprite);
                }
              }
            });
        }
        
        // Floating movement animation - same as original index.html
        gsap.to(textSprite.position, {
          y: textSprite.position.y + 1.5,
          duration: CONFIG.TEXT.FADE_DURATION + 1,
          ease: "power1.out"
        });
      } catch (error) {
        console.error('Error animating text with GSAP, using fallback:', error);
        
        // Use fallback animation for opacity
        animateValue(material, 'opacity', 0, 0.9, CONFIG.TEXT.FADE_DURATION * 300, () => {
          setTimeout(() => {
            animateValue(material, 'opacity', 0.9, 0, CONFIG.TEXT.FADE_DURATION * 700, () => {
              // Clean up
              if (sceneRef.current?.scene) {
                sceneRef.current.scene.remove(textSprite);
                if (material.map) material.map.dispose();
                material.dispose();
                textObjectsRef.current = textObjectsRef.current.filter(obj => obj !== textSprite);
              }
            });
          }, 1000); // 1 second delay as in index.html
        });
        
        // Use fallback animation for position
        animateValue(textSprite.position, 'y', textSprite.position.y, textSprite.position.y + 1.5, 
          (CONFIG.TEXT.FADE_DURATION + 1) * 1000);
      }
    } catch (error) {
      console.error('Error creating floating text sprite:', error);
    }
  };

  // Handle GLView context creation
  const onContextCreate = async (gl) => {
    try {
      // Check if WebGL is available
      console.log('GL Context created:', gl ? 'Yes' : 'No');
      console.log('GL Context properties:', Object.keys(gl).join(', '));
      setDebugMessage('GL context loaded');
      
      // Create renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(CONFIG.COLORS.BACKGROUND);
      
      // Create scene
      const scene = new THREE.Scene();
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.z = 40;
      
      // Store references
      sceneRef.current = { scene, camera, renderer };
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
      const pointLight = new THREE.PointLight(CONFIG.COLORS.NODE_CORE, 0.5, 50);
      scene.add(ambientLight, pointLight);
      
      try {
        // Create the full neural network visualization
        console.log('Creating full neural network visualization');
        
        // Initialize the neural network using the original structure from index.html
        createNodes();
        createConnections();
        createDataPackets();
        
        // Start the pulse timer
        startPulseTimer();
        
        // Start the full animation loop matching the index.html behavior
        const fullAnimate = () => {
          if (!sceneRef.current) return;
          
          const { scene, camera, renderer } = sceneRef.current;
          
          // Smooth scroll interpolation
          scrollY.current += (targetScrollY.current - scrollY.current) * 0.05;
          
          // Update packets
          packetsRef.current.forEach(packet => packet.update());
          
          // Ambient node animation
          nodesRef.current.forEach((node, i) => {
            // Node rotation and ambient movement
            node.group.rotation.y = scrollY.current * 1.2 + i * 0.05;
            
            // Subtle ambient glow pulsation
            if (!node.isPulsing) {
              const time = Date.now() * 0.001;
              const glowFactor = 0.5 + Math.sin(time * 0.5 + i * 0.2) * 0.1;
              node.glowMaterial.opacity = glowFactor;
              
              // Subtle scale for core
              const baseScale = 1 + Math.sin(time * 2 + i * 0.3) * 0.05;
              node.mesh.scale.setScalar(baseScale);
            }
          });
          
          // Camera control - smoother movement exactly as in index.html
          camera.position.x = Math.sin(scrollY.current * 0.7) * 35;
          camera.position.y = Math.cos(scrollY.current * 0.5) * 35;
          camera.position.z = 40 + Math.sin(scrollY.current * 0.3) * 10;
          camera.lookAt(scene.position);
          
          // Make text objects always face the camera
          textObjectsRef.current.forEach(text => {
            // Ensure text planes always face the camera
            if (text && camera) {
              text.lookAt(camera.position);
            }
          });
          
          // Render the scene
          renderer.render(scene, camera);
          
          // Request next frame
          animationFrameId.current = requestAnimationFrame(fullAnimate);
        };
        
        // Start the full animation
        fullAnimate();
        
        // Set loading to false after everything is ready
        setIsLoading(false);
        
        // Add auto-scroll for visual effect (matches the automatic motion in index.html)
        const autoScroll = () => {
          targetScrollY.current += 0.001;
        };
        
        // Start auto-scroll interval
        const autoScrollInterval = setInterval(autoScroll, 16); // ~60fps
        
        // Clean up on unmount
        return () => {
          clearInterval(autoScrollInterval);
        };
        
      } catch (error) {
        console.error('Error creating neural network visualization:', error);
        setDebugMessage('Scene Error: ' + (error instanceof Error ? error.message : String(error)));
        setIs3DEnabled(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in onContextCreate:', error);
      setDebugMessage('3D Error: ' + (error instanceof Error ? error.message : String(error)));
      setIs3DEnabled(false);
      setIsLoading(false);
    }
  };
  
  // Create network nodes
  const createNodes = () => {
    // Ensure we're using the correct NODE_COUNT from CONFIG
    const totalNodes = CONFIG.NODE_COUNT; // Use 120 as defined in CONFIG
    
    if (!sceneRef.current) return;
    
    const { scene } = sceneRef.current;
    const nodePositions = [];
    
    // Create a more structured arrangement of nodes
    
    // 1. Core central cluster
    const coreCount = Math.floor(totalNodes * 0.3); // 30% in the core
    for(let i = 0; i < coreCount; i++) {
      // Place in spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = CONFIG.STRUCTURE.CORE_RADIUS * (0.3 + Math.random() * 0.7);
      
      const position = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      
      // Add some randomness
      position.x += (Math.random() - 0.5) * CONFIG.STRUCTURE.RANDOMNESS * 20;
      position.y += (Math.random() - 0.5) * CONFIG.STRUCTURE.RANDOMNESS * 20;
      position.z += (Math.random() - 0.5) * CONFIG.STRUCTURE.RANDOMNESS * 20;
      
      nodePositions.push(position);
    }
    
    // 2. Orbital layers
    const layerCount = CONFIG.STRUCTURE.LAYER_COUNT;
    const nodesPerLayer = Math.floor((totalNodes - coreCount) / layerCount);
    
    for(let layer = 0; layer < layerCount; layer++) {
      const layerRadius = CONFIG.STRUCTURE.CORE_RADIUS + (layer + 1) * 10;
      
      for(let i = 0; i < nodesPerLayer; i++) {
        // Distribute more evenly around the layer
        const theta = (i / nodesPerLayer) * Math.PI * 2;
        const phi = Math.acos((Math.random() * 1.8) - 0.9); // Concentrated around equator
        
        const position = new THREE.Vector3(
          layerRadius * Math.sin(phi) * Math.cos(theta),
          layerRadius * Math.sin(phi) * Math.sin(theta),
          layerRadius * Math.cos(phi) * 0.6 // Flatten slightly
        );
        
        // Add controlled randomness
        position.x += (Math.random() - 0.5) * CONFIG.STRUCTURE.RANDOMNESS * 15;
        position.y += (Math.random() - 0.5) * CONFIG.STRUCTURE.RANDOMNESS * 15;
        position.z += (Math.random() - 0.5) * CONFIG.STRUCTURE.RANDOMNESS * 15;
        
        nodePositions.push(position);
      }
    }
    
    // Fill remaining nodes with random positions if needed
    while(nodePositions.length < totalNodes) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 70
      );
      nodePositions.push(position);
    }

    // Create nodes
    nodesRef.current = nodePositions.map(pos => {
      const node = new NeuralNode(pos, scene);
      return node;
    });
  };
  
  // Create connections between nodes
  const createConnections = () => {
    if (!sceneRef.current || !nodesRef.current.length) return;
    
    const { scene } = sceneRef.current;
    const nodes = nodesRef.current;
    
    const connectionMaterial = new THREE.LineBasicMaterial({
      color: CONFIG.COLORS.CONNECTION,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });

    // Track unconnected nodes
    let unconnectedNodes = [...nodes];
    
    // First pass: connect nearby nodes
    nodes.forEach((nodeA) => {
      // Find nearby nodes
      const nearbyNodes = nodes
        .filter(nodeB => nodeB !== nodeA)
        .map(nodeB => ({
          node: nodeB,
          distance: nodeA.group.position.distanceTo(nodeB.group.position)
        }))
        .sort((a, b) => a.distance - b.distance);
      
      // Connect to closest nodes (proportional to distance)
      const maxConnections = Math.min(6, Math.ceil(nearbyNodes.length / 10));
      let connectionsToMake = Math.floor(Math.random() * (maxConnections - CONFIG.STRUCTURE.MIN_CONNECTIONS + 1)) + CONFIG.STRUCTURE.MIN_CONNECTIONS;
      
      for (let i = 0; i < nearbyNodes.length && connectionsToMake > 0; i++) {
        const { node: nodeB, distance } = nearbyNodes[i];
        
        // Only connect if within reasonable distance
        if (distance < CONFIG.STRUCTURE.CONNECTION_DISTANCE) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodeA.group.position,
            nodeB.group.position
          ]);
          const line = new THREE.Line(geometry, connectionMaterial);
          connectionsRef.current.push(line);
          scene.add(line);
          
          // Update connection counts
          nodeA.connections++;
          nodeB.connections++;
          connectionsToMake--;
          
          // Remove from unconnected nodes if they now have connections
          if (nodeA.connections >= CONFIG.STRUCTURE.MIN_CONNECTIONS) {
            unconnectedNodes = unconnectedNodes.filter(n => n !== nodeA);
          }
          if (nodeB.connections >= CONFIG.STRUCTURE.MIN_CONNECTIONS) {
            unconnectedNodes = unconnectedNodes.filter(n => n !== nodeB);
          }
        }
      }
    });
    
    // Second pass: ensure all nodes have minimum connections
    unconnectedNodes.forEach(nodeA => {
      const connectionsNeeded = CONFIG.STRUCTURE.MIN_CONNECTIONS - nodeA.connections;
      if (connectionsNeeded > 0) {
        // Find closest nodes to connect to
        const potentialConnections = nodes
          .filter(nodeB => nodeB !== nodeA)
          .sort((a, b) => 
            nodeA.group.position.distanceTo(a.group.position) - 
            nodeA.group.position.distanceTo(b.group.position)
          );
        
        // Connect to closest available nodes
        for (let i = 0; i < potentialConnections.length && nodeA.connections < CONFIG.STRUCTURE.MIN_CONNECTIONS; i++) {
          const nodeB = potentialConnections[i];
          
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodeA.group.position,
            nodeB.group.position
          ]);
          const line = new THREE.Line(geometry, connectionMaterial);
          connectionsRef.current.push(line);
          scene.add(line);
          
          nodeA.connections++;
          nodeB.connections++;
        }
      }
    });
  };
  
  // Create data packets that travel along connections
  const createDataPackets = () => {
    if (!sceneRef.current || !connectionsRef.current.length) return;
    
    const { scene } = sceneRef.current;
    const connections = connectionsRef.current;
    
    // Reduce packets by 30% as specified in the original config
    const connectionCount = connections.length;
    const packetCount = Math.floor(connectionCount * (1 - CONFIG.STRUCTURE.PACKET_REDUCTION));
    
    console.log(`Creating ${packetCount} data packets from ${connectionCount} connections`);
    
    // Shuffle connections and select only 70%
    const shuffledConnections = [...connections].sort(() => 0.5 - Math.random());
    const selectedConnections = shuffledConnections.slice(0, packetCount);
    
    selectedConnections.forEach(conn => {
      try {
        // Safely extract position data from the connection
        const positionAttribute = conn.geometry.attributes.position;
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        
        // Handle array or buffer attribute
        if (positionAttribute.getX) {
          // Using BufferAttribute methods
          start.set(
            positionAttribute.getX(0),
            positionAttribute.getY(0),
            positionAttribute.getZ(0)
          );
          end.set(
            positionAttribute.getX(1),
            positionAttribute.getY(1),
            positionAttribute.getZ(1)
          );
        } else {
          // Trying to access directly from array
          const array = positionAttribute.array;
          start.set(array[0], array[1], array[2]);
          end.set(array[3], array[4], array[5]);
        }
        
        const packet = new DataPacket(start, end, scene);
        packetsRef.current.push(packet);
      } catch (err) {
        console.error('Error creating data packet:', err);
      }
    });
    
    console.log(`Created ${packetsRef.current.length} data packets`);
  };
  
  // Start pulse timer
  const startPulseTimer = () => {
    // Clear existing timer if any
    if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
    
    // Set up new timer
    pulseTimerRef.current = setInterval(() => {
      triggerRandomNodesPulse();
    }, CONFIG.MOVEMENT.PULSE_INTERVAL);
  };
  
  // Pulse random nodes
  const triggerRandomNodesPulse = () => {
    if (!nodesRef.current.length) return;
    
    // Original calculation was 1/4 of nodes, reduce by additional 30%
    const originalPulseCount = Math.floor(nodesRef.current.length / 4);
    const reducedPulseCount = Math.floor(originalPulseCount * 0.7); // Reduce by 30%
    
    console.log(`Pulsing ${reducedPulseCount} nodes (reduced from ${originalPulseCount}, 30% reduction)`);
    
    // Select random nodes to pulse
    const shuffled = [...nodesRef.current].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, reducedPulseCount);
    
    selected.forEach(node => node.pulse());
  };
  
  // Navigate to Login or Signup screens
  const navigateToLogin = () => {
    navigation.navigate('Login');
  };
  
  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  // Helper for card sections
  const CardSection = ({ children, style }: { children: React.ReactNode, style?: any }) => (
    <View style={[styles.cardSection, style]}>
      {children}
    </View>
  );

  // Helper for section titles
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.sectionTitle}>{children}</Text>
  );

  // Content for the scrollable sections
  const renderContent = () => {
    // Create smooth animation paths that follow the nodes
    return (
      <>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.appName}>LIMITLESS RESEARCH</Text>
          <Text style={styles.tagline}>AI-Driven Research Platform</Text>
        </View>

        {/* Features Overview - Linked Node Design */}
        <View style={styles.featuresSection}>
          <View style={styles.featuresHeader}>
            <TouchableOpacity 
              style={styles.getStartedButton} 
              onPress={navigateToLogin}
            >
              <LinearGradient
                colors={['#3498db', '#6c63ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>GET STARTED</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.featuresFlowContainer}>
            {/* Feature 1 */}
            <View style={styles.featureNodeContainer}>
              <View style={[styles.featureNode, styles.featureNode1]}>
                <Text style={styles.featureNodeIcon}>🔍</Text>
              </View>
              <View style={styles.featureNodeTextContainer}>
                <Text style={styles.featureTitle}>Advanced Research</Text>
                <Text style={styles.featureDescription}>
                  Harness AI for in-depth research across multiple domains.
                </Text>
              </View>
            </View>
            <View style={[styles.featureConnector, styles.connector1]} />
            
            {/* Feature 2 */}
            <View style={[styles.featureNodeContainer, styles.featureNodeContainerRight]}>
              <View style={[styles.featureNodeTextContainer, styles.featureNodeTextContainerRight]}>
                <Text style={[styles.featureTitle, styles.featureTitleRight]}>Neural Processing</Text>
                <Text style={[styles.featureDescription, styles.featureDescriptionRight]}>
                  Complex data analysis delivering comprehensive insights.
                </Text>
              </View>
              <View style={[styles.featureNode, styles.featureNode2]}>
                <Text style={styles.featureNodeIcon}>🧠</Text>
              </View>
            </View>
            <View style={[styles.featureConnector, styles.connector2]} />

            {/* Feature 3 */}
            <View style={styles.featureNodeContainer}>
              <View style={[styles.featureNode, styles.featureNode3]}>
                <Text style={styles.featureNodeIcon}>📊</Text>
              </View>
              <View style={styles.featureNodeTextContainer}>
                <Text style={styles.featureTitle}>Real-time Results</Text>
                <Text style={styles.featureDescription}>
                  Instant updates and progress tracking via our monitoring system.
                </Text>
              </View>
            </View>
            <View style={[styles.featureConnector, styles.connector3]} />

            {/* Feature 4 - Replace Secure Platform with Advanced Controls */}
            <View style={[styles.featureNodeContainer, styles.featureNodeContainerRight]}>
              <View style={[styles.featureNodeTextContainer, styles.featureNodeTextContainerRight]}>
                <Text style={[styles.featureTitle, styles.featureTitleRight]}>Advanced Controls</Text>
                <Text style={[styles.featureDescription, styles.featureDescriptionRight]}>
                  Customize your research with specialized agents and detailed parameters.
                </Text>
              </View>
              <View style={[styles.featureNode, styles.featureNode4]}>
                <Text style={styles.featureNodeIcon}>🎮</Text>
              </View>
            </View>
          </View>
        </View>

        {/* How It Works Section */}
        <CardSection>
          <SectionTitle>HOW IT WORKS</SectionTitle>
          <View style={styles.flowContainer}>
            {/* Animated Pulse Element */}
            <Animated.View 
              style={[
                styles.pulseAnimation,
                {
                  transform: [
                    { translateX: pulseAnimatedValue.interpolate({
                      inputRange: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1],
                      outputRange: [20, width * 0.33, width * 0.66, width * 0.5, width * 0.66, width * 0.33, 20]
                    })},
                    { translateY: pulseAnimatedValue.interpolate({
                      inputRange: [0, 0.4, 0.5, 0.6, 1],
                      outputRange: [40, 40, 90, 140, 140]
                    })}
                  ]
                }
              ]} 
            />

            {/* Flow container with horizontal layout */}
            <View style={styles.horizontalFlowWrapper}>
              {/* Row 1 */}
              <View style={styles.flowRow}>
                {/* Node 1: User Query */}
                <View style={[styles.flowNode, styles.flowNode1]}>
                  <View style={styles.flowNodeIcon}>
                    <Text style={styles.nodeEmoji}>🔍</Text>
                    <Text style={styles.flowNodeIconText}>1</Text>
                  </View>
                  <View style={styles.flowNodeContent}>
                    <Text style={styles.flowNodeTitle}>User Query</Text>
                    <Text style={styles.flowNodeDescription}>
                      Submit your research request
                    </Text>
                  </View>
                </View>
                
                {/* Horizontal connector */}
                <View style={styles.horizontalConnector} />
                
                {/* Node 2: Clarifying Questions */}
                <View style={[styles.flowNode, styles.flowNode2]}>
                  <View style={styles.flowNodeIcon}>
                    <Text style={styles.nodeEmoji}>🤔</Text>
                    <Text style={styles.flowNodeIconText}>2</Text>
                  </View>
                  <View style={styles.flowNodeContent}>
                    <Text style={styles.flowNodeTitle}>Clarifying Questions</Text>
                    <Text style={styles.flowNodeDescription}>
                      Refine parameters
                    </Text>
                  </View>
                </View>
                
                {/* Horizontal connector */}
                <View style={styles.horizontalConnector} />
                
                {/* Node 3: Web Scraping + AI */}
                <View style={[styles.flowNode, styles.flowNode3]}>
                  <View style={styles.flowNodeIcon}>
                    <Text style={styles.nodeEmoji}>🌐</Text>
                    <Text style={styles.flowNodeIconText}>3</Text>
                  </View>
                  <View style={styles.flowNodeContent}>
                    <Text style={styles.flowNodeTitle}>Web + AI Analysis</Text>
                    <Text style={styles.flowNodeDescription}>
                      Process information
                    </Text>
                  </View>
                </View>
              </View>

              {/* Row connector (down arrow) */}
              <View style={styles.rowConnector}>
                <View style={styles.rowConnectorLine} />
                <View style={styles.rowConnectorArrow} />
              </View>
              
              {/* Row 2 (reverse order) */}
              <View style={styles.flowRow}>
                {/* Node 6: Results */}
                <View style={[styles.flowNode, styles.flowNode6]}>
                  <View style={styles.flowNodeIcon}>
                    <Text style={styles.nodeEmoji}>📊</Text>
                    <Text style={styles.flowNodeIconText}>6</Text>
                  </View>
                  <View style={styles.flowNodeContent}>
                    <Text style={styles.flowNodeTitle}>Structured Results</Text>
                    <Text style={styles.flowNodeDescription}>
                      Formatted with sources
                    </Text>
                  </View>
                </View>
                
                {/* Horizontal connector */}
                <View style={styles.horizontalConnector} />
                
                {/* Node 5: Derive Info */}
                <View style={[styles.flowNode, styles.flowNode5]}>
                  <View style={styles.flowNodeIcon}>
                    <Text style={styles.nodeEmoji}>🧩</Text>
                    <Text style={styles.flowNodeIconText}>5</Text>
                  </View>
                  <View style={styles.flowNodeContent}>
                    <Text style={styles.flowNodeTitle}>Information Synthesis</Text>
                    <Text style={styles.flowNodeDescription}>
                      Insights with sources
                    </Text>
                  </View>
                </View>
                
                {/* Horizontal connector */}
                <View style={styles.horizontalConnector} />
                
                {/* Node 4: Progress Updates */}
                <View style={[styles.flowNode, styles.flowNode4]}>
                  <View style={styles.flowNodeIcon}>
                    <Text style={styles.nodeEmoji}>⏱️</Text>
                    <Text style={styles.flowNodeIconText}>4</Text>
                  </View>
                  <View style={styles.flowNodeContent}>
                    <Text style={styles.flowNodeTitle}>Real-time Updates</Text>
                    <Text style={styles.flowNodeDescription}>
                      Monitor progress
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </CardSection>

        {/* Research Agents Section - Circular Quadrant Layout */}
        <View style={styles.agentsSection}>
          <SectionTitle>OUR RESEARCH AGENTS</SectionTitle>
          <View style={styles.agentsCircleContainer}>
            {/* Center Decoration */}
            <View style={styles.agentsCenterCircle} />
            
            {/* Agent Quadrants */}
            <TouchableOpacity style={[styles.agentQuadrant, styles.agentQuadrantTopLeft]}>
              <Text style={styles.agentIcon}>💼</Text>
              <Text style={styles.agentName}>Business</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.agentQuadrant, styles.agentQuadrantTopRight]}>
              <Text style={styles.agentIcon}>🩺</Text>
              <Text style={styles.agentName}>Health</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.agentQuadrant, styles.agentQuadrantBottomLeft]}>
              <Text style={styles.agentIcon}>🌐</Text>
              <Text style={styles.agentName}>General</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.agentQuadrant, styles.agentQuadrantBottomRight]}>
              <Text style={styles.agentIcon}>💰</Text>
              <Text style={styles.agentName}>Financial</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.agentsDescription}>
            Choose a specialized AI agent tailored to your specific research domain.
          </Text>
        </View>

        {/* Call to Action */}
        <CardSection style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Transform Your Research?</Text>
          <Text style={styles.ctaDescription}>
            Join now and access powerful AI-driven research tools at your fingertips.
          </Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.ctaButton, styles.loginButton]} 
              onPress={navigateToLogin}
            >
              <LinearGradient
                colors={['#3498db', '#6c63ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Log In</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.ctaButton, styles.signupButton]} 
              onPress={navigateToSignup}
            >
              <LinearGradient
                colors={['#6c63ff', '#3498db']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CardSection>
        
        {/* Research Parameters Modal */}
        <Modal
          visible={showResearchModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowResearchModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Research Parameters</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowResearchModal(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollContent}>
                {/* Research Breadth Slider */}
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ 
                    type: 'timing',
                    duration: 300
                  } as any}
                  style={styles.parameterSection}
                >
                  <View style={styles.parameterHeader}>
                    <Text style={styles.parameterLabel}>Research Breadth</Text>
                    <View style={styles.valueBadge}>
                      <Text style={styles.valueText}>{breadth}</Text>
                    </View>
                  </View>
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <Animated.View 
                        style={[
                          styles.sliderFill, 
                          { 
                            width: breadthAnimValue.interpolate({
                              inputRange: [1, 5],
                              outputRange: ['20%', '100%']
                            }) 
                          }
                        ]} 
                      >
                        <LinearGradient
                          colors={['#6c63ff', '#3B82F6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ flex: 1, borderRadius: 2 }}
                        />
                      </Animated.View>
                    </View>
                    <View style={styles.sliderValues}>
                      {[1, 2, 3, 4, 5].map(value => (
                        <TouchableOpacity 
                          key={value} 
                          onPress={() => setBreadth(value)}
                          style={[
                            styles.sliderValue,
                            breadth >= value && styles.filledSliderValue,
                            breadth === value && styles.activeSliderValue
                          ]}
                        >
                          <MotiView
                            animate={{
                              scale: breadth === value ? 1.2 : 1
                            }}
                            transition={{
                              type: 'spring',
                              damping: 10,
                              stiffness: 100
                            } as any}
                          >
                            <Text style={[
                              styles.sliderValueText,
                              breadth >= value && styles.filledSliderValueText
                            ]}>{value}</Text>
                          </MotiView>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </MotiView>

                {/* Research Depth Slider */}
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ 
                    type: 'timing',
                    duration: 300,
                    delay: 100
                  } as any}
                  style={styles.parameterSection}
                >
                  <View style={styles.parameterHeader}>
                    <Text style={styles.parameterLabel}>Research Depth</Text>
                    <View style={styles.valueBadge}>
                      <Text style={styles.valueText}>{depth}</Text>
                    </View>
                  </View>
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <Animated.View 
                        style={[
                          styles.sliderFill, 
                          { 
                            width: depthAnimValue.interpolate({
                              inputRange: [1, 5],
                              outputRange: ['20%', '100%']
                            }) 
                          }
                        ]} 
                      >
                        <LinearGradient
                          colors={['#6c63ff', '#3B82F6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ flex: 1, borderRadius: 2 }}
                        />
                      </Animated.View>
                    </View>
                    <View style={styles.sliderValues}>
                      {[1, 2, 3, 4, 5].map(value => (
                        <TouchableOpacity 
                          key={value} 
                          onPress={() => setDepth(value)}
                          style={[
                            styles.sliderValue,
                            depth >= value && styles.filledSliderValue,
                            depth === value && styles.activeSliderValue
                          ]}
                        >
                          <MotiView
                            animate={{
                              scale: depth === value ? 1.2 : 1
                            }}
                            transition={{
                              type: 'spring',
                              damping: 10,
                              stiffness: 100
                            } as any}
                          >
                            <Text style={[
                              styles.sliderValueText,
                              depth >= value && styles.filledSliderValueText
                            ]}>{value}</Text>
                          </MotiView>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </MotiView>

                {/* Include Technical Terms Toggle */}
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ 
                    type: 'timing',
                    duration: 300,
                    delay: 200
                  } as any}
                  style={styles.parameterSection}
                >
                  <View style={styles.parameterHeader}>
                    <Text style={styles.parameterLabel}>Include Technical Terms</Text>
                      <TouchableOpacity 
                      style={styles.toggleContainer}
                        onPress={() => setIncludeTechnicalTerms(!includeTechnicalTerms)}
                      activeOpacity={0.7}
                    >
                      <MotiView
                        animate={{
                          backgroundColor: includeTechnicalTerms ? '#6c63ff' : 'rgba(108, 99, 255, 0.2)'
                        }}
                        transition={{
                          type: 'timing',
                          duration: 200
                        } as any}
                        style={styles.toggleTrack}
                      >
                        <MotiView
                          animate={{
                            translateX: includeTechnicalTerms ? 24 : 0
                          }}
                          transition={{
                            type: 'spring',
                            damping: 15,
                            stiffness: 120
                          } as any}
                          style={styles.toggleThumb}
                        >
                          {includeTechnicalTerms && (
                            <MotiView
                              from={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ 
                                type: 'timing',
                                duration: 200
                              } as any}
                            >
                              <Text style={styles.toggleText}>Y</Text>
                            </MotiView>
                          )}
                        </MotiView>
                      </MotiView>
                      <Text style={styles.toggleLabel}>
                        {includeTechnicalTerms ? "Yes" : "No"}
                      </Text>
                      </TouchableOpacity>
                  </View>
                </MotiView>

                {/* Output Format Dropdown */}
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ 
                    type: 'timing',
                    duration: 300,
                    delay: 300
                  } as any}
                  style={styles.parameterSection}
                >
                  <Text style={styles.parameterLabel}>Output Format</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowDropdown(!showDropdown)}
                  >
                    <Text style={styles.dropdownButtonText}>{outputType}</Text>
                    <Ionicons name="chevron-down" size={20} color="white" />
                  </TouchableOpacity>
                  
                  {showDropdown && (
                    <View style={styles.dropdownMenu}>
                      {outputOptions.map((option) => (
                        <TouchableOpacity 
                          key={option}
                          style={[styles.dropdownItem, option === outputType && styles.dropdownItemActive]}
                          onPress={() => {
                            setOutputType(option);
                            setShowDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            option === outputType && styles.dropdownItemTextActive
                          ]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </MotiView>

                {/* Query Input */}
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ 
                    type: 'timing',
                    duration: 300,
                    delay: 400
                  } as any}
                  style={styles.queryInputContainer}
                >
                  <TextInput
                    style={styles.queryInput}
                    placeholder="Type your query..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={query}
                    onChangeText={setQuery}
                    multiline
                  />
                </MotiView>
                
                {/* Submit Button */}
                <TouchableOpacity 
                  style={[styles.submitButton, isLoading && { opacity: 0.7 }, {marginTop: 20}]}
                  onPress={handleSubmitResearch}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Research</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
        
        {/* Questions Modal */}
        <Modal
          visible={showQuestionsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowQuestionsModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Answer Questions</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowQuestionsModal(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollContent}>
                {receivedQuestions ? (
                  <>
                    <Text style={styles.questionsLabel}>
                      Please answer the following questions to help refine your research results:
                    </Text>
                    
                    {questions.map((question, index) => (
                      <View key={question.id} style={styles.questionContainer}>
                        <Text style={styles.questionText}>{index + 1}. {question.question}</Text>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="Type your answer..."
                          placeholderTextColor="rgba(255, 255, 255, 0.5)"
                          value={question.answer}
                          onChangeText={(text) => updateQuestionAnswer(question.id, text)}
                          multiline
                        />
                      </View>
                    ))}
                    
                    <TouchableOpacity 
                      style={[styles.submitButton, isLoading && { opacity: 0.7 }, {marginTop: 20}]}
                      onPress={handleSubmitAnswers}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Answers</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6c63ff" />
                    <Text style={styles.loadingText}>Loading questions...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  // Effects to handle fade-in of content
  useEffect(() => {
    if (layoutCalculated && is3DInitialized) {
      console.log('Starting content fade in animation');
      // Use Animated.timing instead of setState
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }).start();
    }
  }, [layoutCalculated, is3DInitialized]);

  // Handle 3D context initialization
  useEffect(() => {
    setIs3DEnabled(is3DAvailable);
  }, []);

  // Replace the DOM-specific animation with React Native Animated API
  useEffect(() => {
    // Create a looping animation for the pulse
    Animated.loop(
      Animated.timing(pulseAnimatedValue, {
        toValue: 1,
        duration: 6000, // 6 seconds to travel the entire flow path
        easing: Easing.linear,
        useNativeDriver: true // Use native driver for better performance
      })
    ).start();
    
    // Clean up
    return () => {
      pulseAnimatedValue.stopAnimation();
    };
  }, [pulseAnimatedValue]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Top Right Buttons */}
      <View style={styles.topRightButtons}>
        <TouchableOpacity
          style={[styles.topButton, styles.loginButton]}
          onPress={navigateToLogin}
        >
          <Text style={styles.topButtonText}>LOGIN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topButton, styles.signupButton]}
          onPress={navigateToSignup}
        >
          <Text style={styles.topButtonText}>SIGNUP</Text>
        </TouchableOpacity>
      </View>
      
      {/* 3D Visualization Background */}
      <View style={styles.container}>
        {is3DEnabled && GLView ? (
          <GLView
            style={styles.three}
            onContextCreate={onContextCreate}
            ref={glViewRef}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              3D visualization unavailable: {debugMessage}
            </Text>
          </View>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLORS.accentPrimary} />
            <Text style={[styles.loadingText, { color: THEME_COLORS.textPrimary }]}>Initializing Neural Core...</Text>
          </View>
        )}
        
        {/* Scrollable Content */}
        <ScrollView 
          style={[styles.scrollContainer, { opacity: contentOpacity }]}
          onLayout={() => setLayoutCalculated(true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  },
  topRightButtons: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 35, // Reduced from 50 to 35 for iOS
    right: 15,
    flexDirection: 'row',
    zIndex: 10, // Ensure buttons are above everything
  },
  topButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME_COLORS.accentPrimary,
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME_COLORS.accentPrimary,
  },
  topButtonText: {
    color: THEME_COLORS.buttonText,
    fontSize: 14,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  three: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.background,
  },
  fallbackText: {
    color: THEME_COLORS.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60, // Reduced padding
    paddingBottom: 40,
    paddingHorizontal: 16, // Reduced horizontal padding for small screens
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20, // Reduced for mobile
    marginTop: 0, // Removed margin
    marginBottom: 20, // Reduced margin
  },
  appName: {
    fontSize: width < 350 ? 28 : 32, // Reduced size on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8, // Reduced margin
    textShadowColor: 'rgba(100, 255, 218, 0.4)', // Use accentPrimary for shadow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  tagline: {
    fontSize: width < 350 ? 16 : 18, // Smaller on small screens
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 0, // Removed margin
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginHorizontal: 10,
    minWidth: 120,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSection: {
    backgroundColor: THEME_COLORS.cardBackground,
    borderRadius: 15,
    padding: width < 350 ? 18 : 25, // Reduced padding on small screens
    marginVertical: 16, // Reduced margin
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Subtle glow effect using accent color
    borderColor: 'rgba(100, 255, 218, 0.2)', // accentPrimary
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: width < 350 ? 20 : 24, // Smaller on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.accentPrimary,
    marginBottom: 20, // Reduced margin
    textAlign: 'center',
  },
  featuresSection: {
    marginVertical: 20, // Reduced margin
  },
  featuresFlowContainer: {
    position: 'relative', // Needed for absolute positioning of connectors
    paddingVertical: 10, // Reduced padding
  },
  featureNodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30, // Reduced spacing
    width: '100%',
  },
  featureNodeContainerRight: {
    justifyContent: 'flex-end',
  },
  featureNode: {
    width: width < 350 ? 60 : 70, // Smaller on small screens
    height: width < 350 ? 60 : 70, // Smaller on small screens
    borderRadius: width < 350 ? 30 : 35, // Adjust border radius
    backgroundColor: 'rgba(100, 255, 218, 0.15)', // accentPrimary with alpha
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME_COLORS.accentPrimary,
    elevation: 5,
    shadowColor: THEME_COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  featureNodeIcon: {
    fontSize: width < 350 ? 26 : 30, // Smaller on small screens
  },
  featureNodeTextContainer: {
    flex: 1,
    marginLeft: 12, // Reduced for small screens
  },
  featureNodeTextContainerRight: {
    marginLeft: 0,
    marginRight: 12, // Reduced for small screens
    alignItems: 'flex-end', // Align text to the right
  },
  featureTitle: {
    fontSize: width < 350 ? 16 : 18, // Smaller on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    marginBottom: 6, // Reduced margin
  },
  featureTitleRight: {
    textAlign: 'right',
  },
  featureDescription: {
    fontSize: 15,
    color: THEME_COLORS.featureDescriptionYellow, // Changed to soft yellow
    lineHeight: 22,
  },
  featureDescriptionRight: {
    textAlign: 'right',
    color: THEME_COLORS.featureDescriptionYellow, // Changed to soft yellow
  },
  featureConnector: {
    position: 'absolute',
    width: 2,
    height: 40, // Reduced height on mobile
    backgroundColor: 'rgba(100, 255, 218, 0.4)', // accentPrimary with alpha
    left: '50%',
    marginLeft: -1, // Center the line
    zIndex: -1, // Place behind nodes
  },
  connector1: { top: 80 },   // Adjusted position
  connector2: { top: 180 }, // Adjusted position
  connector3: { top: 280 }, // Adjusted position
  
  // Specific node positions (adjust if needed based on layout)
  featureNode1: {
    borderLeftColor: '#64FFDA',
    borderLeftWidth: 3,
  },
  featureNode2: {
    borderLeftColor: '#FF64C8',
    borderLeftWidth: 3,
  },
  featureNode3: {
    borderLeftColor: '#64B6FF',
    borderLeftWidth: 3,
  },
  featureNode4: {
    borderLeftColor: '#FFA064',
    borderLeftWidth: 3,
  },
  featureNode5: {
    borderLeftColor: '#A064FF',
    borderLeftWidth: 3,
  },
  featureNode6: {
    borderLeftColor: '#64FFA0',
    borderLeftWidth: 3,
  },

  stepsContainer: {
    marginTop: 10,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 30,
    alignItems: 'center',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLORS.background,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 15,
    color: THEME_COLORS.textSecondary,
    lineHeight: 22,
  },
  capabilitiesContainer: {
    marginTop: 10,
  },
  capabilityItem: {
    marginBottom: 25,
  },
  capabilityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    marginBottom: 15,
  },
  capabilityList: {
    marginLeft: 10,
  },
  capabilityListItem: {
    fontSize: 14,
    color: THEME_COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  ctaSection: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(100, 255, 218, 0.3)',
    borderWidth: 1,
    marginTop: 30, // Reduced margin
    marginBottom: 20, // Added margin bottom
  },
  ctaTitle: {
    fontSize: width < 350 ? 22 : 26, // Smaller on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    marginBottom: 12, // Reduced margin
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: width < 350 ? 14 : 16, // Smaller on small screens
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20, // Reduced margin
    lineHeight: width < 350 ? 20 : 24, // Reduced line height
    maxWidth: '90%', // Increased width for better text wrapping
  },
  ctaButton: {
    backgroundColor: THEME_COLORS.accentPrimary,
    paddingVertical: 14, // Reduced padding
    paddingHorizontal: 40, // Reduced padding
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaButtonText: {
    color: THEME_COLORS.background,
    fontSize: width < 350 ? 16 : 18, // Smaller on small screens
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40, // Reduced margin
    marginBottom: 20, // Reduced margin
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(160, 177, 200, 0.2)',
    paddingTop: 20, // Reduced padding
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap', // Enable wrapping for small screens
    marginBottom: 0,
  },
  footerLink: {
    color: THEME_COLORS.accentSecondary,
    marginHorizontal: 10, // Reduced margin
    fontSize: width < 350 ? 12 : 14, // Smaller on small screens
    marginBottom: 8, // Add margin bottom to handle wrapping
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 25, 47, 0.7)',
  },
  loadingText: {
    fontSize: width < 350 ? 16 : 18, // Smaller on small screens
    fontWeight: 'bold',
    marginTop: 20,
  },
  // Research Agents Section Styles
  agentsSection: {
    marginVertical: 20, // Reduced margin
    alignItems: 'center',
  },
  agentsCircleContainer: {
    width: width * 0.8, // 80% of screen width
    height: width * 0.8, // Make height match width for circular container
    borderRadius: (width * 0.8) / 2, // Half of width for perfect circle
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20, // Reduced margin
    borderWidth: 2,
    borderColor: 'rgba(100, 255, 218, 0.1)', // Faint accent border
  },
  agentsCenterCircle: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
    backgroundColor: 'rgba(100, 255, 218, 0.1)', // Faint accent center
    position: 'absolute',
  },
  agentQuadrant: {
    position: 'absolute',
    width: '42%', // Reduced size to fit better
    height: '42%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 350 ? 8 : 10, // Reduced padding on small screens
    borderRadius: 15, // Slightly rounded quadrants
    backgroundColor: 'rgba(25, 45, 65, 0.6)', // Semi-transparent card background
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  agentQuadrantTopLeft: { top: '5%', left: '5%' }, // Adjusted positioning
  agentQuadrantTopRight: { top: '5%', right: '5%' }, // Adjusted positioning
  agentQuadrantBottomLeft: { bottom: '5%', left: '5%' }, // Adjusted positioning
  agentQuadrantBottomRight: { bottom: '5%', right: '5%' }, // Adjusted positioning
  agentIcon: {
    fontSize: width < 350 ? 24 : 30, // Smaller on small screens
    marginBottom: 6, // Reduced margin
  },
  agentName: {
    fontSize: width < 350 ? 14 : 16, // Smaller on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    textAlign: 'center',
  },
  agentsDescription: {
    fontSize: width < 350 ? 13 : 15, // Smaller on small screens
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16, // Reduced margin
    maxWidth: '90%', // Increased from 85% for better text wrapping
    lineHeight: width < 350 ? 18 : 22, // Reduced line height
  },
  flowContainer: {
    position: 'relative',
    paddingVertical: 15, // Reduced padding
    overflow: 'hidden',
  },
  pulseAnimationContainer: {
    position: 'absolute',
    left: 20, // Align with the flow nodes
    top: 0,
    height: '100%',
    width: 2,
    zIndex: 1,
  },
  pulseAnimation: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.accentPrimary,
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: THEME_COLORS.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 30, // Ensure it's above everything
  },
  horizontalFlowWrapper: {
    width: '100%',
    paddingHorizontal: 5,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15, // Reduced margin
    position: 'relative',
    width: '100%',
  },
  horizontalConnector: {
    height: 2,
    backgroundColor: 'rgba(100, 255, 218, 0.4)',
    flex: 1,
    marginHorizontal: 5,
    maxWidth: width < 350 ? 20 : 30, // Reduced width on small screens
  },
  rowConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30, // Reduced height
    width: 30,
    alignSelf: 'center',
    position: 'relative',
  },
  rowConnectorLine: {
    height: 20, // Reduced height
    width: 2,
    backgroundColor: 'rgba(100, 255, 218, 0.4)',
  },
  rowConnectorArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6, // Reduced size
    borderRightWidth: 6, // Reduced size
    borderTopWidth: 10, // Reduced size
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(100, 255, 218, 0.4)',
    position: 'absolute',
    bottom: 0,
  },
  flowNode: {
    backgroundColor: 'rgba(25, 45, 65, 0.7)',
    borderRadius: 15,
    padding: width < 350 ? 10 : 15, // Smaller padding on small screens
    width: '30%',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
    shadowColor: 'rgba(100, 255, 218, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  flowNodeIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: width < 350 ? 6 : 10, // Reduced margin
  },
  nodeEmoji: {
    fontSize: width < 350 ? 16 : 20, // Smaller on small screens
    marginRight: 6, // Reduced margin
  },
  flowNodeIconText: {
    fontSize: width < 350 ? 14 : 18, // Smaller on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.accentPrimary,
    backgroundColor: 'rgba(25, 45, 65, 0.9)',
    width: width < 350 ? 20 : 24, // Smaller on small screens
    height: width < 350 ? 20 : 24, // Smaller on small screens
    borderRadius: width < 350 ? 10 : 12, // Adjust border radius
    textAlign: 'center',
    overflow: 'hidden',
  },
  flowNodeContent: {
    flex: 1,
  },
  flowNodeTitle: {
    fontSize: width < 350 ? 12 : 14, // Smaller on small screens
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    marginBottom: 2, // Reduced margin
  },
  flowNodeDescription: {
    fontSize: width < 350 ? 10 : 12, // Smaller on small screens
    color: THEME_COLORS.textSecondary,
    lineHeight: width < 350 ? 14 : 16, // Reduced line height
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  buttonGradient: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  researchButton: {
    backgroundColor: THEME_COLORS.accentSecondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: THEME_COLORS.cardBackground,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
  },
  closeButton: {
    padding: 10,
  },
  modalScrollContent: {
    width: '100%',
  },
  parameterSection: {
    marginBottom: 30,
  },
  parameterHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  parameterLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: THEME_COLORS.accentPrimary,
    borderRadius: 5,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME_COLORS.background,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 10,
  },
  sliderTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 5,
  },
  sliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderValue: {
    width: '20%',
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledSliderValue: {
    backgroundColor: THEME_COLORS.accentPrimary,
  },
  activeSliderValue: {
    borderWidth: 2,
    borderColor: THEME_COLORS.accentPrimary,
  },
  sliderValueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME_COLORS.background,
  },
  filledSliderValueText: {
    color: THEME_COLORS.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleTrack: {
    width: 40,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME_COLORS.background,
  },
  toggleLabel: {
    fontSize: 14,
    color: THEME_COLORS.textSecondary,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: THEME_COLORS.accentPrimary,
    borderRadius: 5,
    marginBottom: 10,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME_COLORS.background,
  },
  dropdownMenu: {
    width: '100%',
    backgroundColor: THEME_COLORS.cardBackground,
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 5,
  },
  dropdownItemActive: {
    backgroundColor: THEME_COLORS.accentSecondary,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
  },
  dropdownItemTextActive: {
    color: THEME_COLORS.background,
  },
  queryInputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  queryInput: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    padding: 10,
    color: THEME_COLORS.textPrimary,
    marginBottom: 10,
  },
  submitButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME_COLORS.background,
  },
  questionsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLORS.textPrimary,
    marginBottom: 10,
  },
  questionContainer: {
    marginBottom: 15,
  },
  questionText: {
    fontSize: 16,
    color: THEME_COLORS.textSecondary,
    marginBottom: 5,
  },
  answerInput: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    padding: 10,
    color: THEME_COLORS.textPrimary,
  },
  // Add these styles for the flowNode variants
  flowNode1: {
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  
  flowNode2: {
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  
  flowNode3: {
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  
  flowNode4: {
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  
  flowNode5: {
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  
  flowNode6: {
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  featuresHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  getStartedButton: {
    width: '70%',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
}); 
/* eslint-disable no-trailing-spaces */
import { FeatureDefinition, featureRegistry, FeatureType } from './FeatureRegistry';
import { KeyboardTimingFeatures } from './KeyboardFeatures';
import { MouseMovementFeatures } from './MouseFeatures';
import { ScrollBehaviorFeatures } from './ScrollFeatures';
import { FocusAttentionFeatures } from './FocusFeatures';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('CompositeFeatures');

export interface CompositeTimingFeatures {
  // Cross-modal timing entropy
  globalTimingEntropy: number; // Overall timing unpredictability across all modalities
  crossModalSynchrony: number; // Coordination between input modalities
  temporalCoherence: number; // Consistency of timing patterns across modalities
  
  // Unified rhythm analysis
  masterRhythm: number; // Dominant rhythmic pattern across all inputs
  rhythmicComplexity: number; // Complexity of multi-modal rhythm
  polyrhythmicIndex: number; // Multiple concurrent rhythms
  
  // Attention-motor coupling
  attentionMotorCoherence: number; // How well attention and motor timing align
  cognitiveMotorIntegration: number; // Integration of cognitive and motor processes
  executiveTimingControl: number; // Top-down timing control
  
  // Neurological composite indicators
  globalNeuromotorIndex: number; // Overall neuromotor function
  bradykinesiaComposite: number; // Combined slowness indicators
  dysrhythmiaIndex: number; // Rhythm disruption across modalities
  
  // Fatigue and deterioration
  compositeVitality: number; // Overall energy and consistency
  fatigueProgression: number; // Progressive decline across modalities
  adaptiveCapacity: number; // Ability to maintain performance
  
  // Information-theoretic measures
  mutualInformation: number; // Information shared between modalities
  transferEntropy: number; // Directional information flow
  complexityIndex: number; // Overall behavioral complexity
  
  // Temporal precision metrics
  timingPrecision: number; // Overall timing accuracy
  temporalVariability: number; // Consistency of temporal patterns
  clockingAccuracy: number; // Internal timing accuracy
  
  // Cognitive load composite
  globalCognitiveLoad: number; // Combined cognitive load indicators
  workingMemoryPressure: number; // Multi-modal working memory strain
  attentionalCapacity: number; // Available attention resources
  
  // Behavioral coherence
  behavioralConsistency: number; // Consistency across modalities
  personalityIndex: number; // Stable individual characteristics
  adaptationRate: number; // Speed of behavioral adaptation
  
  timestamp: number;
}

// Extract global timing entropy across all modalities
const globalTimingEntropyAnalysis: FeatureDefinition<{
  keyboard?: KeyboardTimingFeatures,
  mouse?: MouseMovementFeatures,
  scroll?: ScrollBehaviorFeatures,
  focus?: FocusAttentionFeatures
}, Partial<CompositeTimingFeatures>> = {
  id: 'composite_timing_entropy',
  name: 'Global Timing Entropy Analysis',
  description: 'Analyzes timing entropy and predictability across all input modalities',
  type: 'composite' as FeatureType,
  version: '1.0.0',
  priority: 100,
  enabled: true,
  dependencies: ['keyboard_entropy', 'mouse_patterns', 'scroll_patterns'],
  compute: (features) => {
    const { keyboard, mouse, scroll, focus } = features;
    
    // Collect entropy measures from all modalities
    const entropies: number[] = [];
    const weights: number[] = [];
    
    if (keyboard?.dwellEntropy !== undefined) {
      entropies.push(keyboard.dwellEntropy);
      weights.push(0.3); // Keyboard is typically high-information
    }
    
    if (keyboard?.flightEntropy !== undefined) {
      entropies.push(keyboard.flightEntropy);
      weights.push(0.2);
    }
    
    if (mouse?.entropy !== undefined) {
      entropies.push(mouse.entropy);
      weights.push(0.25);
    }
    
    if (scroll?.totalScrollDistance !== undefined && scroll.scrollActionCount !== undefined) {
      // Calculate scroll entropy approximation
      const scrollEntropy = scroll.scrollActionCount > 0 
        ? Math.log2(Math.max(1, scroll.scrollActionCount)) 
        : 0;
      entropies.push(scrollEntropy);
      weights.push(0.15);
    }
    
    if (focus?.attentionCycles !== undefined) {
      // Convert attention cycles to entropy-like measure
      const focusEntropy = focus.attentionCycles > 0 
        ? Math.log2(Math.max(1, focus.attentionCycles)) 
        : 0;
      entropies.push(focusEntropy);
      weights.push(0.1);
    }
    
    if (entropies.length === 0) return {};
    
    // Calculate weighted global entropy
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    const globalTimingEntropy = entropies.reduce((sum, entropy, i) => 
      sum + entropy * normalizedWeights[i], 0);
    
    // Calculate cross-modal synchrony (inverse of entropy variance)
    const entropyMean = entropies.reduce((a, b) => a + b, 0) / entropies.length;
    const entropyVariance = entropies.reduce((sum, e) => sum + Math.pow(e - entropyMean, 2), 0) / entropies.length;
    const crossModalSynchrony = entropyVariance > 0 ? 1 / (1 + Math.sqrt(entropyVariance)) : 1;
    
    // Temporal coherence based on rhythm consistency across modalities
    const rhythmValues: number[] = [];
    
    if (keyboard?.typingRhythm !== undefined) rhythmValues.push(keyboard.typingRhythm);
    if (scroll?.scrollRhythm !== undefined) rhythmValues.push(scroll.scrollRhythm);
    if (focus?.focusRatio !== undefined) rhythmValues.push(focus.focusRatio);
    
    let temporalCoherence = 0;
    if (rhythmValues.length > 1) {
      const rhythmMean = rhythmValues.reduce((a, b) => a + b, 0) / rhythmValues.length;
      const rhythmVariance = rhythmValues.reduce((sum, r) => sum + Math.pow(r - rhythmMean, 2), 0) / rhythmValues.length;
      temporalCoherence = rhythmMean * (1 - Math.sqrt(rhythmVariance));
    }
    
    return {
      globalTimingEntropy,
      crossModalSynchrony,
      temporalCoherence,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 4],
    medicalRelevance: 'critical',
    reliability: 0.85,
    interpretationHints: [
      'Higher global entropy may indicate cognitive complexity or dysfunction',
      'Low cross-modal synchrony suggests coordination difficulties',
      'Temporal coherence reflects unified timing control'
    ]
  }
};

// Extract unified rhythm and polyrhythm analysis
const rhythmAnalysis: FeatureDefinition<{
  keyboard?: KeyboardTimingFeatures,
  mouse?: MouseMovementFeatures,
  scroll?: ScrollBehaviorFeatures,
  focus?: FocusAttentionFeatures
}, Partial<CompositeTimingFeatures>> = {
  id: 'composite_rhythm',
  name: 'Unified Rhythm Analysis',
  description: 'Analyzes rhythmic patterns and complexity across modalities',
  type: 'composite' as FeatureType,
  version: '1.0.0',
  priority: 90,
  enabled: true,
  dependencies: ['keyboard_rhythm', 'mouse_patterns', 'scroll_patterns'],
  compute: (features) => {
    const { keyboard, mouse, scroll } = features;
    
    // Extract rhythm-related measures
    const rhythms: Array<{ value: number; weight: number; frequency?: number }> = [];
    
    if (keyboard?.typingRhythm !== undefined) {
      rhythms.push({ 
        value: keyboard.typingRhythm, 
        weight: 0.4,
        frequency: keyboard.meanFlight > 0 ? 1000 / keyboard.meanFlight : 0
      });
    }
    
    if (keyboard?.microRhythm !== undefined) {
      rhythms.push({ value: keyboard.microRhythm, weight: 0.2 });
    }
    
    if (scroll?.scrollRhythm !== undefined) {
      rhythms.push({ value: scroll.scrollRhythm, weight: 0.25 });
    }
    
    if (mouse?.entropy !== undefined) {
      // Convert entropy to rhythm-like measure (lower entropy = higher rhythm)
      const mouseRhythm = Math.max(0, 1 - mouse.entropy / 4);
      rhythms.push({ value: mouseRhythm, weight: 0.15 });
    }
    
    if (rhythms.length === 0) return {};
    
    // Calculate master rhythm (weighted average)
    const totalWeight = rhythms.reduce((sum, r) => sum + r.weight, 0);
    const masterRhythm = rhythms.reduce((sum, r) => sum + r.value * r.weight, 0) / totalWeight;
    
    // Calculate rhythmic complexity (variance in rhythms)
    const rhythmVariance = rhythms.reduce((sum, r) => 
      sum + Math.pow(r.value - masterRhythm, 2) * r.weight, 0) / totalWeight;
    const rhythmicComplexity = Math.sqrt(rhythmVariance);
    
    // Polyrhythmic index (number of distinct rhythm patterns)
    const uniqueRhythms = new Set();
    const rhythmThreshold = 0.1;
    
    rhythms.forEach(r => {
      const bucketedRhythm = Math.round(r.value / rhythmThreshold) * rhythmThreshold;
      uniqueRhythms.add(bucketedRhythm);
    });
    
    const polyrhythmicIndex = uniqueRhythms.size > 1 ? (uniqueRhythms.size - 1) / rhythms.length : 0;
    
    return {
      masterRhythm,
      rhythmicComplexity,
      polyrhythmicIndex,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'high',
    reliability: 0.80,
    interpretationHints: [
      'Master rhythm reflects overall motor timing consistency',
      'High rhythmic complexity may indicate timing control issues',
      'Polyrhythmic patterns may suggest multitasking abilities'
    ]
  }
};

// Extract neurological composite indicators
const neurologicalComposite: FeatureDefinition<{
  keyboard?: KeyboardTimingFeatures,
  mouse?: MouseMovementFeatures,
  scroll?: ScrollBehaviorFeatures,
  focus?: FocusAttentionFeatures
}, Partial<CompositeTimingFeatures>> = {
  id: 'neurological_composite',
  name: 'Neurological Composite Analysis',
  description: 'Combines neurological indicators across all modalities',
  type: 'composite' as FeatureType,
  version: '1.0.0',
  priority: 95,
  enabled: true,
  dependencies: ['keyboard_neuromotor', 'mouse_tremor', 'scroll_neuromotor'],
  compute: (features) => {
    const { keyboard, mouse, scroll } = features;
    
    // Collect tremor indicators
    const tremorIndicators: number[] = [];
    if (keyboard?.tremorInKeystrokes !== undefined) tremorIndicators.push(keyboard.tremorInKeystrokes);
    if (mouse?.tremorAmplitude !== undefined) tremorIndicators.push(Math.min(1, mouse.tremorAmplitude / 10));
    if (scroll?.scrollTremor !== undefined) tremorIndicators.push(scroll.scrollTremor);
    
    // Collect slowness indicators
    const slownessIndicators: number[] = [];
    if (keyboard?.motorSlowness !== undefined) slownessIndicators.push(keyboard.motorSlowness);
    if (mouse?.meanVelocity !== undefined) {
      // Convert velocity to slowness indicator (normalized)
      const normalizedSlowness = Math.max(0, 1 - mouse.meanVelocity / 1000);
      slownessIndicators.push(normalizedSlowness);
    }
    if (scroll?.meanScrollVelocity !== undefined) {
      const scrollSlowness = Math.max(0, 1 - scroll.meanScrollVelocity / 500);
      slownessIndicators.push(scrollSlowness);
    }
    
    // Collect rhythm disruption indicators
    const dysrhythmiaIndicators: number[] = [];
    if (keyboard?.syncopationIndex !== undefined) dysrhythmiaIndicators.push(keyboard.syncopationIndex);
    if (mouse?.tortuosity !== undefined) dysrhythmiaIndicators.push(Math.min(1, mouse.tortuosity));
    if (scroll?.scrollDirectionChanges !== undefined) {
      dysrhythmiaIndicators.push(Math.min(1, scroll.scrollDirectionChanges));
    }
    
    // Calculate composite scores
    const globalNeuromotorIndex = tremorIndicators.length > 0 
      ? tremorIndicators.reduce((a, b) => a + b, 0) / tremorIndicators.length 
      : 0;
    
    const bradykinesiaComposite = slownessIndicators.length > 0 
      ? slownessIndicators.reduce((a, b) => a + b, 0) / slownessIndicators.length 
      : 0;
    
    const dysrhythmiaIndex = dysrhythmiaIndicators.length > 0 
      ? dysrhythmiaIndicators.reduce((a, b) => a + b, 0) / dysrhythmiaIndicators.length 
      : 0;
    
    return {
      globalNeuromotorIndex,
      bradykinesiaComposite,
      dysrhythmiaIndex,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'critical',
    reliability: 0.85,
    interpretationHints: [
      'Global neuromotor index combines tremor indicators across modalities',
      'Bradykinesia composite reflects overall motor slowness',
      'Dysrhythmia index indicates timing control disruption'
    ]
  }
};

// Extract fatigue and vitality composite
const vitalityComposite: FeatureDefinition<{
  keyboard?: KeyboardTimingFeatures,
  mouse?: MouseMovementFeatures,
  scroll?: ScrollBehaviorFeatures,
  focus?: FocusAttentionFeatures
}, Partial<CompositeTimingFeatures>> = {
  id: 'vitality_composite',
  name: 'Composite Vitality Analysis',
  description: 'Analyzes fatigue, vitality, and adaptive capacity across modalities',
  type: 'composite' as FeatureType,
  version: '1.0.0',
  priority: 85,
  enabled: true,
  dependencies: ['keyboard_neuromotor', 'focus_vigilance', 'scroll_cognitive'],
  compute: (features) => {
    const { keyboard, mouse, scroll, focus } = features;
    
    // Collect fatigue indicators
    const fatigueIndicators: number[] = [];
    if (keyboard?.fatigueIndex !== undefined) fatigueIndicators.push(Math.max(0, keyboard.fatigueIndex));
    if (focus?.attentionFatigue !== undefined) fatigueIndicators.push(Math.max(0, focus.attentionFatigue));
    if (scroll?.scrollFatigue !== undefined) fatigueIndicators.push(Math.max(0, scroll.scrollFatigue));
    
    // Collect vitality indicators (inverse of decline/fatigue)
    const vitalityIndicators: number[] = [];
    if (keyboard?.typingSpeed !== undefined && keyboard.typingSpeed > 0) {
      vitalityIndicators.push(Math.min(1, keyboard.typingSpeed / 300)); // Normalized to typical WPM
    }
  // Use averageActivityLevel as proxy for engagement
  if (focus?.averageActivityLevel !== undefined) vitalityIndicators.push(Math.min(1, focus.averageActivityLevel));
    if (mouse?.movementEfficiency !== undefined) vitalityIndicators.push(mouse.movementEfficiency);
    
    // Collect adaptive capacity indicators
    const adaptiveIndicators: number[] = [];
    if (focus?.cognitiveFlexibility !== undefined) adaptiveIndicators.push(focus.cognitiveFlexibility);
    if (focus?.recoveryEfficiency !== undefined) adaptiveIndicators.push(focus.recoveryEfficiency);
    if (keyboard?.typingRhythm !== undefined) adaptiveIndicators.push(keyboard.typingRhythm);
    
    const fatigueProgression = fatigueIndicators.length > 0 
      ? fatigueIndicators.reduce((a, b) => a + b, 0) / fatigueIndicators.length 
      : 0;
    
    const compositeVitality = vitalityIndicators.length > 0 
      ? vitalityIndicators.reduce((a, b) => a + b, 0) / vitalityIndicators.length 
      : 0;
    
    const adaptiveCapacity = adaptiveIndicators.length > 0 
      ? adaptiveIndicators.reduce((a, b) => a + b, 0) / adaptiveIndicators.length 
      : 0;
    
    return {
      fatigueProgression,
      compositeVitality,
      adaptiveCapacity,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'medium',
    reliability: 0.75,
    interpretationHints: [
      'Fatigue progression indicates declining performance over time',
      'Composite vitality reflects overall energy and consistency',
      'Adaptive capacity measures behavioral flexibility'
    ]
  }
};

// Extract cognitive load composite
const cognitiveLoadComposite: FeatureDefinition<{
  keyboard?: KeyboardTimingFeatures,
  mouse?: MouseMovementFeatures,
  scroll?: ScrollBehaviorFeatures,
  focus?: FocusAttentionFeatures
}, Partial<CompositeTimingFeatures>> = {
  id: 'cognitive_load_composite',
  name: 'Cognitive Load Composite',
  description: 'Combines cognitive load indicators across all modalities',
  type: 'composite' as FeatureType,
  version: '1.0.0',
  priority: 80,
  enabled: true,
  dependencies: ['keyboard_cognitive', 'focus_distraction', 'scroll_cognitive'],
  compute: (features) => {
    const { keyboard, mouse, scroll, focus } = features;
    
    // Collect cognitive load indicators
    const loadIndicators: Array<{ value: number; weight: number }> = [];
    
    if (keyboard?.cognitiveLoad !== undefined) {
      loadIndicators.push({ value: keyboard.cognitiveLoad, weight: 0.3 });
    }
    
    if (keyboard?.workingMemoryStrain !== undefined) {
      loadIndicators.push({ value: keyboard.workingMemoryStrain, weight: 0.25 });
    }
    
    if (focus?.distractionFrequency !== undefined) {
      // Normalize distraction frequency to 0-1 scale
      const normalizedDistraction = Math.min(1, focus.distractionFrequency / 10);
      loadIndicators.push({ value: normalizedDistraction, weight: 0.2 });
    }
    
    if (scroll?.scrollHesitation !== undefined) {
      loadIndicators.push({ value: scroll.scrollHesitation, weight: 0.15 });
    }
    
    if (focus?.multitaskingIndex !== undefined) {
      const normalizedMultitasking = Math.min(1, focus.multitaskingIndex / 5);
      loadIndicators.push({ value: normalizedMultitasking, weight: 0.1 });
    }
    
    if (loadIndicators.length === 0) return {};
    
    // Calculate weighted composite cognitive load
    const totalWeight = loadIndicators.reduce((sum, indicator) => sum + indicator.weight, 0);
    const globalCognitiveLoad = loadIndicators.reduce((sum, indicator) => 
      sum + indicator.value * indicator.weight, 0) / totalWeight;
    
    // Working memory pressure (specific indicators)
    const wmIndicators: number[] = [];
    if (keyboard?.workingMemoryStrain !== undefined) wmIndicators.push(keyboard.workingMemoryStrain);
    if (keyboard?.pauseFrequency !== undefined) wmIndicators.push(Math.min(1, keyboard.pauseFrequency * 10));
    
    const workingMemoryPressure = wmIndicators.length > 0 
      ? wmIndicators.reduce((a, b) => a + b, 0) / wmIndicators.length 
      : 0;
    
    // Attentional capacity (inverse of attention problems)
    const attentionProblems: number[] = [];
    // Approximate attention lapses using inverse of attentionCycles density if available
    if (focus?.attentionCycles !== undefined && focus.sessionDuration) {
      const cyclesPerMinute = focus.sessionDuration > 0 ? (focus.attentionCycles / (focus.sessionDuration / 60000)) : 0;
      // Higher cycles per minute may indicate instability; normalize
      const normalizedInstability = Math.min(1, cyclesPerMinute / 20);
      attentionProblems.push(normalizedInstability);
    }
    if (keyboard?.attentionalLapses !== undefined) attentionProblems.push(keyboard.attentionalLapses);
    if (focus?.distractionFrequency !== undefined) attentionProblems.push(Math.min(1, focus.distractionFrequency / 10));
    
    const avgAttentionProblems = attentionProblems.length > 0 
      ? attentionProblems.reduce((a, b) => a + b, 0) / attentionProblems.length 
      : 0;
    const attentionalCapacity = Math.max(0, 1 - avgAttentionProblems);
    
    return {
      globalCognitiveLoad,
      workingMemoryPressure,
      attentionalCapacity,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'high',
    reliability: 0.80,
    interpretationHints: [
      'Global cognitive load reflects overall mental effort across tasks',
      'Working memory pressure indicates short-term memory strain',
      'Attentional capacity measures available cognitive resources'
    ]
  }
};

/**
 * Register all composite features with the feature registry
 */
export function registerCompositeFeatures(): void {
  try {
    featureRegistry.register(globalTimingEntropyAnalysis);
    featureRegistry.register(rhythmAnalysis);
    featureRegistry.register(neurologicalComposite);
    featureRegistry.register(vitalityComposite);
    featureRegistry.register(cognitiveLoadComposite);
    
    logger.info('Composite features registered successfully', { 
      featureCount: 5,
      types: ['timing_entropy', 'rhythm', 'neurological', 'vitality', 'cognitive_load']
    });
  } catch (error) {
    logger.error('Failed to register composite features', { error });
    throw error;
  }
}

/**
 * Utility function to compute all composite features from individual modality features
 */
export async function computeCompositeFeatures(
  features: {
    keyboard?: KeyboardTimingFeatures,
    mouse?: MouseMovementFeatures,
    scroll?: ScrollBehaviorFeatures,
    focus?: FocusAttentionFeatures
  },
  sessionId: string
): Promise<CompositeTimingFeatures> {
  const compositeFeaturesList = featureRegistry.getByType('composite');
  const results: Partial<CompositeTimingFeatures> = { timestamp: Date.now() };
  
  for (const feature of compositeFeaturesList) {
    try {
      const partial = await feature.compute(features);
      Object.assign(results, partial);
    } catch (error) {
      logger.error('Composite feature computation failed', { 
        featureId: feature.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return results as CompositeTimingFeatures;
}
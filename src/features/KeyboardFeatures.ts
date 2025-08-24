/* eslint-disable no-trailing-spaces */
import { FeatureDefinition, featureRegistry, FeatureType } from './FeatureRegistry';
// KeystrokeMetrics type not exported; using aggregated summaries only.
interface KeystrokeMetrics {
  dwell: number; // key down duration ms
  flight?: number; // interval to next key ms
  force?: number;
  timestamp: number;
  digraphLatency?: number;
  tremorComponent?: number;
  keyCode?: number;
}
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('KeyboardFeatures');

export interface KeyboardTimingFeatures {
  // Dwell time characteristics
  meanDwell: number;
  dwellVariance: number;
  dwellSkewness: number;
  dwellKurtosis: number; // Measure of distribution tail heaviness
  
  // Flight time characteristics  
  meanFlight: number;
  flightVariance: number;
  flightSkewness: number;
  
  // Rhythm and timing patterns
  typingRhythm: number; // Consistency of inter-keystroke intervals
  rhythmVariance: number;
  syncopationIndex: number; // Irregular timing patterns
  
  // Pressure and force patterns
  pressureMean?: number;
  pressureVariance?: number;
  forceVariability?: number;
  
  // Pause and hesitation analysis
  pauseFrequency: number; // Pauses > 1 second
  hesitationIndex: number; // Short pauses suggesting uncertainty
  backspaceRate: number; // Error correction frequency
  
  // Neuromotor characteristics
  tremorInKeystrokes: number; // Timing irregularities suggesting tremor
  motorSlowness: number; // Overall bradykinesia indicator
  fatigueIndex: number; // Progressive slowdown over time
  
  // Cognitive load indicators
  cognitiveLoad: number; // Derived from timing patterns
  workingMemoryStrain: number; // Based on pause patterns
  attentionalLapses: number; // Extended pauses or rhythm disruptions
  
  // Temporal entropy measures
  dwellEntropy: number; // Predictability of dwell times
  flightEntropy: number; // Predictability of flight times
  sequenceEntropy: number; // Overall sequence predictability
  
  // Advanced timing metrics
  microRhythm: number; // Fine-grained timing consistency
  temporalPrecision: number; // Accuracy of intended timing
  adaptiveControl: number; // Ability to modify timing patterns
  
  // Summary statistics
  totalKeystrokes: number;
  typingSpeed: number; // Characters per minute
  errorRate: number; // Backspace ratio
  sessionDuration: number;
  
  timestamp: number;
}

// Extract basic timing characteristics
const basicTiming: FeatureDefinition<KeystrokeMetrics[], Partial<KeyboardTimingFeatures>> = {
  id: 'keyboard_basic_timing',
  name: 'Basic Keyboard Timing',
  description: 'Fundamental dwell time and flight time characteristics',
  type: 'keystroke' as FeatureType,
  version: '1.0.0',
  priority: 100,
  enabled: true,
  compute: (metrics: KeystrokeMetrics[]) => {
    if (metrics.length < 5) return {};
    
  const dwellTimes = metrics.map(m => m.dwell).filter(d => d > 0);
  const flightTimes = metrics.map(m => m.flight || 0).filter(f => f > 0);
    
    if (dwellTimes.length === 0) return {};
    
    // Dwell time statistics
    const meanDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    const dwellVariance = dwellTimes.reduce((sum, d) => sum + Math.pow(d - meanDwell, 2), 0) / dwellTimes.length;
    const dwellStd = Math.sqrt(dwellVariance);
    
    // Skewness calculation for dwell times
    const dwellSkewness = dwellStd === 0 ? 0 :
      dwellTimes.reduce((sum, d) => sum + Math.pow((d - meanDwell) / dwellStd, 3), 0) / dwellTimes.length;
    
    // Kurtosis calculation for dwell times
    const dwellKurtosis = dwellStd === 0 ? 0 :
      dwellTimes.reduce((sum, d) => sum + Math.pow((d - meanDwell) / dwellStd, 4), 0) / dwellTimes.length - 3;
    
    // Flight time statistics
    let meanFlight = 0;
    let flightVariance = 0;
    let flightSkewness = 0;
    
    if (flightTimes.length > 0) {
      meanFlight = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
      flightVariance = flightTimes.reduce((sum, f) => sum + Math.pow(f - meanFlight, 2), 0) / flightTimes.length;
      const flightStd = Math.sqrt(flightVariance);
      
      flightSkewness = flightStd === 0 ? 0 :
        flightTimes.reduce((sum, f) => sum + Math.pow((f - meanFlight) / flightStd, 3), 0) / flightTimes.length;
    }
    
    // Basic performance metrics
    const totalKeystrokes = metrics.length;
    const sessionStart = metrics[0].timestamp;
    const sessionEnd = metrics[metrics.length - 1].timestamp;
    const sessionDuration = sessionEnd - sessionStart;
    
    // Typing speed (simplified - assumes average word length of 5 characters)
    const typingSpeed = sessionDuration > 0 ? (totalKeystrokes * 12000) / sessionDuration : 0; // CPM
    
    // Error rate (backspace frequency)
  const backspaces = metrics.filter(m => m.keyCode === 8 || m.keyCode === 46).length;
    const errorRate = totalKeystrokes > 0 ? backspaces / totalKeystrokes : 0;
    
    return {
      meanDwell,
      dwellVariance,
      dwellSkewness,
      dwellKurtosis,
      meanFlight,
      flightVariance,
      flightSkewness,
      totalKeystrokes,
      typingSpeed,
      errorRate,
      sessionDuration,
      timestamp: Date.now()
    };
  },
  validate: (result) => {
    return result.meanDwell !== undefined && result.meanDwell > 0 && result.meanDwell < 2000;
  },
  metadata: {
    unit: 'milliseconds',
    range: [10, 500],
    medicalRelevance: 'critical',
    reliability: 0.95,
    interpretationHints: [
      'Increased dwell variance may indicate motor control issues',
      'Positive skewness suggests occasional very long keystrokes',
      'High kurtosis indicates inconsistent timing patterns'
    ]
  }
};

// Extract rhythm and consistency patterns
const rhythmAnalysis: FeatureDefinition<KeystrokeMetrics[], Partial<KeyboardTimingFeatures>> = {
  id: 'keyboard_rhythm',
  name: 'Keyboard Rhythm Analysis',
  description: 'Analyzes timing consistency and rhythmic patterns in typing',
  type: 'keystroke' as FeatureType,
  version: '1.0.0',
  priority: 90,
  enabled: true,
  compute: (metrics: KeystrokeMetrics[]) => {
    if (metrics.length < 10) return {};
    
    // Calculate inter-keystroke intervals (IKI)
    const intervals: number[] = [];
    for (let i = 1; i < metrics.length; i++) {
      const interval = metrics[i].timestamp - metrics[i-1].timestamp;
      intervals.push(interval);
    }
    
    if (intervals.length === 0) return {};
    
    // Typing rhythm: coefficient of variation of IKI
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) / intervals.length;
    const intervalStd = Math.sqrt(intervalVariance);
    const typingRhythm = meanInterval > 0 ? 1 - (intervalStd / meanInterval) : 0; // 1 = perfect rhythm, 0 = chaotic
    const rhythmVariance = intervalVariance;
    
    // Syncopation index: measure of timing irregularities
    let syncopationIndex = 0;
    for (let i = 1; i < intervals.length; i++) {
      const ratio = Math.abs(intervals[i] - intervals[i-1]) / Math.max(intervals[i], intervals[i-1]);
      syncopationIndex += ratio;
    }
    syncopationIndex /= (intervals.length - 1);
    
    // Micro-rhythm: consistency within small windows
    const windowSize = 5;
    let microRhythm = 0;
    let windowCount = 0;
    
    for (let i = 0; i <= intervals.length - windowSize; i++) {
      const window = intervals.slice(i, i + windowSize);
      const windowMean = window.reduce((a, b) => a + b, 0) / windowSize;
      const windowVar = window.reduce((sum, v) => sum + Math.pow(v - windowMean, 2), 0) / windowSize;
      const windowCV = windowMean > 0 ? Math.sqrt(windowVar) / windowMean : 1;
      microRhythm += (1 - windowCV);
      windowCount++;
    }
    microRhythm = windowCount > 0 ? microRhythm / windowCount : 0;
    
    return {
      typingRhythm,
      rhythmVariance,
      syncopationIndex,
      microRhythm,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'high',
    reliability: 0.80,
    interpretationHints: [
      'Lower rhythm scores may indicate motor timing deficits',
      'High syncopation suggests irregular motor control',
      'Micro-rhythm captures fine motor consistency'
    ]
  }
};

// Extract neuromotor indicators
const neuromotorAnalysis: FeatureDefinition<KeystrokeMetrics[], Partial<KeyboardTimingFeatures>> = {
  id: 'keyboard_neuromotor',
  name: 'Neuromotor Indicators',
  description: 'Detects timing patterns associated with neurological conditions',
  type: 'keystroke' as FeatureType,
  version: '1.0.0',
  priority: 95,
  enabled: true,
  compute: (metrics: KeystrokeMetrics[]) => {
    if (metrics.length < 20) return {};
    
    const intervals: number[] = [];
  const dwellTimes = metrics.map(m => m.dwell).filter(d => d > 0);
    
    for (let i = 1; i < metrics.length; i++) {
      intervals.push(metrics[i].timestamp - metrics[i-1].timestamp);
    }
    
    // Tremor detection in keystroke timing
    // Look for 4-6 Hz oscillations in timing patterns
    let tremorInKeystrokes = 0;
    const targetPeriod = 1000 / 5; // 5 Hz = 200ms period
    const tolerance = 50; // ±50ms tolerance
    
    for (let i = 0; i < intervals.length - 4; i++) {
      const segment = intervals.slice(i, i + 4);
      const avgPeriod = segment.reduce((a, b) => a + b, 0) / 4;
      
      if (Math.abs(avgPeriod - targetPeriod) < tolerance) {
        const consistency = 1 - (Math.max(...segment) - Math.min(...segment)) / avgPeriod;
        tremorInKeystrokes += consistency;
      }
    }
    tremorInKeystrokes = Math.max(0, tremorInKeystrokes / Math.max(1, intervals.length - 3));
    
    // Motor slowness: compare to normative data
    const meanDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    const normativeDwell = 100; // ms, typical value
    const motorSlowness = Math.max(0, (meanDwell - normativeDwell) / normativeDwell);
    
    // Fatigue index: progressive slowdown over time
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    
    const firstHalfMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const fatigueIndex = firstHalfMean > 0 ? (secondHalfMean - firstHalfMean) / firstHalfMean : 0;
    
    return {
      tremorInKeystrokes,
      motorSlowness,
      fatigueIndex,
      timestamp: Date.now()
    };
  },
  metadata: {
    medicalRelevance: 'critical',
    reliability: 0.70,
    interpretationHints: [
      'Tremor detection requires validation with clinical measures',
      'Motor slowness correlates with bradykinesia',
      'Fatigue index may indicate disease progression'
    ]
  }
};

// Extract cognitive load indicators
const cognitiveAnalysis: FeatureDefinition<KeystrokeMetrics[], Partial<KeyboardTimingFeatures>> = {
  id: 'keyboard_cognitive',
  name: 'Cognitive Load Analysis',
  description: 'Infers cognitive states from typing patterns and pauses',
  type: 'keystroke' as FeatureType,
  version: '1.0.0',
  priority: 85,
  enabled: true,
  compute: (metrics: KeystrokeMetrics[]) => {
    if (metrics.length < 15) return {};
    
    const intervals: number[] = [];
    for (let i = 1; i < metrics.length; i++) {
      intervals.push(metrics[i].timestamp - metrics[i-1].timestamp);
    }
    
    // Pause analysis
    const longPauses = intervals.filter(i => i > 1000); // > 1 second
    const shortPauses = intervals.filter(i => i > 300 && i <= 1000); // 300ms - 1s
    
    const pauseFrequency = longPauses.length / metrics.length;
    const hesitationIndex = shortPauses.length / metrics.length;
    
    // Cognitive load estimation based on pause patterns and timing variability
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) / intervals.length;
    const coefficientOfVariation = Math.sqrt(intervalVariance) / meanInterval;
    
    // Higher variability + more pauses = higher cognitive load
    const cognitiveLoad = Math.min(1, (coefficientOfVariation * 0.5) + (pauseFrequency * 2) + (hesitationIndex * 1));
    
    // Working memory strain: based on clustering of long pauses
    let workingMemoryStrain = 0;
    const pauseWindow = 5; // Look at clusters of pauses
    for (let i = 0; i <= intervals.length - pauseWindow; i++) {
      const window = intervals.slice(i, i + pauseWindow);
      const pausesInWindow = window.filter(p => p > 500).length;
      if (pausesInWindow >= 3) {
        workingMemoryStrain += pausesInWindow / pauseWindow;
      }
    }
    workingMemoryStrain = workingMemoryStrain / Math.max(1, intervals.length - pauseWindow + 1);
    
    // Attentional lapses: very long pauses (> 3 seconds)
    const veryLongPauses = intervals.filter(i => i > 3000);
    const attentionalLapses = veryLongPauses.length / metrics.length;
    
    return {
      pauseFrequency,
      hesitationIndex,
      cognitiveLoad,
      workingMemoryStrain,
      attentionalLapses,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'medium',
    reliability: 0.65,
    interpretationHints: [
      'Higher cognitive load may indicate processing difficulties',
      'Working memory strain relates to executive function',
      'Attentional lapses may suggest attention deficits'
    ]
  }
};

// Extract entropy measures
const entropyAnalysis: FeatureDefinition<KeystrokeMetrics[], Partial<KeyboardTimingFeatures>> = {
  id: 'keyboard_entropy',
  name: 'Keyboard Entropy Analysis',
  description: 'Measures predictability and randomness in typing patterns',
  type: 'keystroke' as FeatureType,
  version: '1.0.0',
  priority: 75,
  enabled: true,
  compute: (metrics: KeystrokeMetrics[]) => {
    if (metrics.length < 20) return {};
    
  const dwellTimes = metrics.map(m => m.dwell).filter(d => d > 0);
  const flightTimes = metrics.map(m => m.flight || 0).filter(f => f > 0);
    
    // Dwell time entropy
    const dwellEntropy = calculateEntropy(dwellTimes, 10); // 10 bins
    
    // Flight time entropy  
    const flightEntropy = flightTimes.length > 0 ? calculateEntropy(flightTimes, 10) : 0;
    
    // Sequence entropy: based on keystroke patterns
  const keySequence = metrics.map(m => m.keyCode || 0);
    const sequenceEntropy = calculateSequenceEntropy(keySequence);
    
    return {
      dwellEntropy,
      flightEntropy,
      sequenceEntropy,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 4], // log2(max_bins)
    medicalRelevance: 'medium',
    reliability: 0.75,
    interpretationHints: [
      'Higher entropy indicates more variable/unpredictable timing',
      'Very low entropy may suggest stereotyped behavior',
      'Sequence entropy measures cognitive flexibility'
    ]
  }
};

// Helper function to calculate entropy
function calculateEntropy(values: number[], bins: number): number {
  if (values.length === 0) return 0;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) return 0;
  
  const binWidth = range / bins;
  const histogram = new Array(bins).fill(0);
  
  values.forEach(value => {
    const bin = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    histogram[bin]++;
  });
  
  let entropy = 0;
  const total = values.length;
  
  histogram.forEach(count => {
    if (count > 0) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
  });
  
  return entropy;
}

// Helper function for sequence entropy
function calculateSequenceEntropy(sequence: number[]): number {
  if (sequence.length === 0) return 0;
  
  const counts = new Map<number, number>();
  sequence.forEach(key => {
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  
  let entropy = 0;
  const total = sequence.length;
  
  counts.forEach(count => {
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  });
  
  return entropy;
}

/**
 * Register all keyboard features with the feature registry
 */
export function registerKeyboardFeatures(): void {
  try {
    featureRegistry.register(basicTiming);
    featureRegistry.register(rhythmAnalysis);
    featureRegistry.register(neuromotorAnalysis);
    featureRegistry.register(cognitiveAnalysis);
    featureRegistry.register(entropyAnalysis);
    
    logger.info('Keyboard features registered successfully', { 
      featureCount: 5,
      types: ['basic_timing', 'rhythm', 'neuromotor', 'cognitive', 'entropy']
    });
  } catch (error) {
    logger.error('Failed to register keyboard features', { error });
    throw error;
  }
}

/**
 * Utility function to compute all keyboard features from metrics
 */
export async function computeKeyboardFeatures(metrics: KeystrokeMetrics[], sessionId: string): Promise<KeyboardTimingFeatures> {
  const keyboardFeatures = featureRegistry.getByType('keystroke');
  const results: Partial<KeyboardTimingFeatures> = { timestamp: Date.now() };
  
  for (const feature of keyboardFeatures) {
    try {
      const partial = await feature.compute(metrics);
      Object.assign(results, partial);
    } catch (error) {
      logger.error('Keyboard feature computation failed', { 
        featureId: feature.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return results as KeyboardTimingFeatures;
}
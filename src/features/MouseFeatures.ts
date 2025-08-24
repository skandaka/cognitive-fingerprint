/* eslint-disable no-trailing-spaces */
import { FeatureDefinition, featureRegistry, FeatureType } from './FeatureRegistry';
import { MouseSample } from '../collectors/MouseTracker';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('MouseFeatures');

export interface MouseMovementFeatures {
  // Velocity characteristics
  meanVelocity: number;
  maxVelocity: number;
  velocityVariance: number;
  velocitySkewness: number; // Asymmetry in velocity distribution
  
  // Acceleration patterns
  meanAcceleration: number;
  accelerationVariance: number;
  jerkMetric: number; // Rate of change of acceleration (smoothness)
  
  // Movement patterns
  straightnessIndex: number; // How direct the paths are
  tortuosity: number; // Path complexity/waviness
  pauseFrequency: number; // Frequency of movement pauses
  movementEfficiency: number; // Direct distance / actual path length
  
  // Tremor detection
  tremorFrequency?: number; // Dominant frequency in 4-6Hz range
  tremorAmplitude: number;
  tremorPower: number; // Power spectral density in tremor band
  
  // Interaction patterns
  clickAccuracy: number; // Distance from click to intended target
  dwellTime: number; // Time spent hovering over elements
  scrollSmoothnessIndex: number;
  
  // Timing characteristics
  reactionTime: number; // Time from stimulus to movement start
  movementTime: number; // Duration of directed movements
  idleTime: number; // Time without movement
  
  // Complexity measures
  fractalDimension?: number; // Complexity of movement paths
  entropy: number; // Unpredictability of movement patterns
  
  timestamp: number;
}

// Extract velocity-based features
// Note: We operate on raw MouseSample data (t, x, y) rather than aggregated MouseMetrics
const velocityFeatures: FeatureDefinition<MouseSample[], Partial<MouseMovementFeatures>> = {
  id: 'mouse_velocity',
  name: 'Mouse Velocity Analysis',
  description: 'Extracts velocity and acceleration characteristics from mouse movements',
  type: 'mouse' as FeatureType,
  version: '1.0.0',
  priority: 100,
  enabled: true,
  compute: (metrics: MouseSample[]) => {
    if (!metrics.length) return {};
    
    const velocities: number[] = [];
    const accelerations: number[] = [];
    const jerks: number[] = [];
    
    for (let i = 1; i < metrics.length; i++) {
      const curr = metrics[i];
      const prev = metrics[i - 1];
  const dt = curr.t - prev.t;
      
      if (dt > 0) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / (dt / 1000); // pixels/second
        velocities.push(velocity);
        
        if (i > 1) {
          const prevVel = velocities[velocities.length - 2];
          const acceleration = (velocity - prevVel) / (dt / 1000);
          accelerations.push(acceleration);
          
          if (i > 2) {
            const prevAcc = accelerations[accelerations.length - 2];
            const jerk = (acceleration - prevAcc) / (dt / 1000);
            jerks.push(jerk);
          }
        }
      }
    }
    
    if (velocities.length === 0) return {};
    
    const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const maxVelocity = Math.max(...velocities);
    const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - meanVelocity, 2), 0) / velocities.length;
    
    // Skewness calculation
    const velocityStd = Math.sqrt(velocityVariance);
    const velocitySkewness = velocityStd === 0 ? 0 : 
      velocities.reduce((sum, v) => sum + Math.pow((v - meanVelocity) / velocityStd, 3), 0) / velocities.length;
    
    const meanAcceleration = accelerations.length ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length : 0;
    const accelerationVariance = accelerations.length ? 
      accelerations.reduce((sum, a) => sum + Math.pow(a - meanAcceleration, 2), 0) / accelerations.length : 0;
    
    const jerkMetric = jerks.length ? Math.sqrt(jerks.reduce((sum, j) => sum + j * j, 0) / jerks.length) : 0;
    
    return {
      meanVelocity,
      maxVelocity,
      velocityVariance,
      velocitySkewness,
      meanAcceleration,
      accelerationVariance,
      jerkMetric,
      timestamp: Date.now()
    };
  },
  validate: (result) => {
    return result.meanVelocity !== undefined && result.meanVelocity >= 0;
  },
  metadata: {
    unit: 'pixels/second',
    range: [0, 10000],
    medicalRelevance: 'high',
    reliability: 0.85,
    interpretationHints: [
      'Higher jerk values may indicate motor control issues',
      'Velocity variance increases with tremor conditions',
      'Skewness patterns differ between neurological conditions'
    ]
  }
};

// Extract movement pattern features
const movementPatterns: FeatureDefinition<MouseSample[], Partial<MouseMovementFeatures>> = {
  id: 'mouse_patterns',
  name: 'Mouse Movement Patterns',
  description: 'Analyzes path characteristics, efficiency, and complexity of mouse movements',
  type: 'mouse' as FeatureType,
  version: '1.0.0',
  priority: 90,
  enabled: true,
  compute: (metrics: MouseSample[]) => {
    if (metrics.length < 3) return {};
    
    // Calculate path characteristics
    let totalDistance = 0;
    let directDistance = 0;
    let pauseCount = 0;
    const pathPoints: Array<{ x: number; y: number }> = [];
    
    for (let i = 1; i < metrics.length; i++) {
      const curr = metrics[i];
      const prev = metrics[i - 1];
  const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segmentDistance = Math.sqrt(dx * dx + dy * dy);
      
      totalDistance += segmentDistance;
      pathPoints.push({ x: curr.x, y: curr.y });
      
      // Detect pauses (movement < 2 pixels)
      if (segmentDistance < 2) {
        pauseCount++;
      }
    }
    
    // Direct distance from start to end
    if (metrics.length >= 2) {
      const start = metrics[0];
      const end = metrics[metrics.length - 1];
      directDistance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    }
    
    const movementEfficiency = totalDistance > 0 ? directDistance / totalDistance : 1;
    const pauseFrequency = pauseCount / metrics.length;
    
    // Tortuosity: measure of path complexity
    const tortuosity = totalDistance > directDistance ? (totalDistance / directDistance) - 1 : 0;
    
    // Straightness index: how direct the overall path is
    const straightnessIndex = directDistance > 0 ? directDistance / totalDistance : 0;
    
    // Simple entropy calculation based on direction changes
    const directionChanges = [];
    for (let i = 2; i < metrics.length; i++) {
      const curr = metrics[i];
      const prev = metrics[i - 1];
      const prev2 = metrics[i - 2];
      
      const angle1 = Math.atan2(prev.y - prev2.y, prev.x - prev2.x);
      const angle2 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      let angleChange = Math.abs(angle2 - angle1);
      
      // Normalize to [0, π]
      if (angleChange > Math.PI) angleChange = 2 * Math.PI - angleChange;
      directionChanges.push(angleChange);
    }
    
    // Calculate entropy from direction change distribution
    const bins = 8;
    const binWidth = Math.PI / bins;
    const histogram = new Array(bins).fill(0);
    
    directionChanges.forEach(angle => {
      const bin = Math.min(Math.floor(angle / binWidth), bins - 1);
      histogram[bin]++;
    });
    
    let entropy = 0;
    const total = directionChanges.length;
    if (total > 0) {
      histogram.forEach(count => {
        if (count > 0) {
          const probability = count / total;
          entropy -= probability * Math.log2(probability);
        }
      });
    }
    
    return {
      straightnessIndex,
      tortuosity,
      pauseFrequency,
      movementEfficiency,
      entropy,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'medium',
    reliability: 0.80,
    interpretationHints: [
      'Lower movement efficiency may indicate motor planning difficulties',
      'Higher tortuosity can suggest tremor or coordination issues',
      'Entropy measures movement unpredictability'
    ]
  }
};

// Extract tremor-related features
const tremorAnalysis: FeatureDefinition<MouseSample[], Partial<MouseMovementFeatures>> = {
  id: 'mouse_tremor',
  name: 'Mouse Tremor Detection',
  description: 'Analyzes frequency domain characteristics to detect tremor patterns',
  type: 'mouse' as FeatureType,
  version: '1.0.0',
  priority: 95,
  enabled: true,
  compute: (metrics: MouseSample[]) => {
    if (metrics.length < 50) return {}; // Need sufficient data for FFT
    
    // Extract position variations for tremor analysis
    const xPositions: number[] = [];
    const yPositions: number[] = [];
    const timestamps: number[] = [];
    
    metrics.forEach(m => {
      xPositions.push(m.x);
      yPositions.push(m.y);
      timestamps.push(m.t);
    });
    
    // Simple tremor amplitude calculation
    let xVariance = 0;
    let yVariance = 0;
    const meanX = xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
    const meanY = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;
    
    xPositions.forEach(x => xVariance += Math.pow(x - meanX, 2));
    yPositions.forEach(y => yVariance += Math.pow(y - meanY, 2));
    
    xVariance /= xPositions.length;
    yVariance /= yPositions.length;
    
    const tremorAmplitude = Math.sqrt(xVariance + yVariance);
    
    // Simplified tremor power calculation
    // In a full implementation, this would use FFT to analyze 4-6Hz band
    let highFreqPower = 0;
    for (let i = 1; i < metrics.length - 1; i++) {
      const curr = metrics[i];
  const prev = metrics[i - 1];
  const next = metrics[i + 1];
      
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      
      // Detect direction reversals (high frequency oscillations)
      if ((dx1 * dx2 < 0) || (dy1 * dy2 < 0)) {
        highFreqPower += Math.sqrt(dx1 * dx1 + dy1 * dy1);
      }
    }
    
    const tremorPower = highFreqPower / metrics.length;
    
    return {
      tremorAmplitude,
      tremorPower,
      timestamp: Date.now()
    };
  },
  metadata: {
    unit: 'pixels',
    medicalRelevance: 'critical',
    reliability: 0.75,
    interpretationHints: [
      'Tremor amplitude > 5 pixels may indicate motor tremor',
      'Power analysis can differentiate tremor types',
      'Resting vs. action tremor patterns differ'
    ]
  }
};

// Extract timing and interaction features
const timingFeatures: FeatureDefinition<MouseSample[], Partial<MouseMovementFeatures>> = {
  id: 'mouse_timing',
  name: 'Mouse Timing Analysis',
  description: 'Analyzes temporal characteristics of mouse interactions',
  type: 'mouse' as FeatureType,
  version: '1.0.0',
  priority: 80,
  enabled: true,
  compute: (metrics: MouseSample[]) => {
    if (metrics.length < 2) return {};
    
    // Calculate dwell times and movement segments
    const dwellTimes: number[] = [];
    const movementTimes: number[] = [];
    const idleTimes: number[] = [];
    
  let lastMoveTime = metrics[0].t;
    let movementStart = null;
    let idleStart = null;
    
    for (let i = 1; i < metrics.length; i++) {
      const curr = metrics[i];
      const prev = metrics[i - 1];
  const dt = curr.t - prev.t;
  const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      
      if (distance > 2) { // Movement detected
        if (idleStart !== null) {
          idleTimes.push(curr.t - idleStart);
          idleStart = null;
        }
        
        if (movementStart === null) {
          movementStart = prev.t;
        }
  lastMoveTime = curr.t;
        
      } else { // Little or no movement
        if (movementStart !== null) {
          movementTimes.push(lastMoveTime - movementStart);
          movementStart = null;
        }
        
        if (idleStart === null) {
          idleStart = curr.t;
        }
        
        dwellTimes.push(dt);
      }
    }
    
    const meanDwellTime = dwellTimes.length ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0;
    const meanMovementTime = movementTimes.length ? movementTimes.reduce((a, b) => a + b, 0) / movementTimes.length : 0;
    const meanIdleTime = idleTimes.length ? idleTimes.reduce((a, b) => a + b, 0) / idleTimes.length : 0;
    
    // Simple reaction time estimation (first movement after idle)
    const reactionTime = movementTimes.length > 0 ? movementTimes[0] : 0;
    
    return {
      dwellTime: meanDwellTime,
      movementTime: meanMovementTime,
      idleTime: meanIdleTime,
      reactionTime,
      timestamp: Date.now()
    };
  },
  metadata: {
    unit: 'milliseconds',
    medicalRelevance: 'medium',
    reliability: 0.75,
    interpretationHints: [
      'Increased dwell times may indicate decision-making difficulties',
      'Prolonged movement times can suggest motor slowness',
      'Reaction time changes with cognitive load'
    ]
  }
};

/**
 * Register all mouse features with the feature registry
 */
export function registerMouseFeatures(): void {
  try {
    featureRegistry.register(velocityFeatures);
    featureRegistry.register(movementPatterns);
    featureRegistry.register(tremorAnalysis);
    featureRegistry.register(timingFeatures);
    
    logger.info('Mouse features registered successfully', { 
      featureCount: 4,
      types: ['velocity', 'patterns', 'tremor', 'timing']
    });
  } catch (error) {
    logger.error('Failed to register mouse features', { error });
    throw error;
  }
}

/**
 * Utility function to compute all mouse features from metrics
 */
export async function computeMouseFeatures(metrics: MouseSample[], sessionId: string): Promise<MouseMovementFeatures> {
  const mouseFeatures = featureRegistry.getByType('mouse');
  const results: Partial<MouseMovementFeatures> = { timestamp: Date.now() };
  
  for (const feature of mouseFeatures) {
    try {
      const partial = await feature.compute(metrics);
      Object.assign(results, partial);
    } catch (error) {
      logger.error('Mouse feature computation failed', { 
        featureId: feature.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return results as MouseMovementFeatures;
}
/* eslint-disable no-trailing-spaces */
import { FeatureDefinition, featureRegistry, FeatureType } from './FeatureRegistry';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('ScrollFeatures');

export interface ScrollEvent {
  timestamp: number;
  deltaX: number;
  deltaY: number;
  scrollTop: number;
  scrollLeft: number;
  target?: string; // Element identifier
  viewportHeight: number;
  contentHeight: number;
}

export interface ScrollBehaviorFeatures {
  // Scroll velocity and acceleration
  meanScrollVelocity: number;
  maxScrollVelocity: number;
  scrollAcceleration: number;
  velocityVariance: number;
  
  // Scroll patterns and direction
  verticalScrollRatio: number; // Preference for vertical vs horizontal
  scrollDirectionChanges: number; // Frequency of direction reversals
  scrollConsistency: number; // Consistency of scroll amounts
  scrollRhythm: number; // Regularity of scroll timing
  
  // Scroll efficiency and navigation
  scrollEfficiency: number; // Direct scrolling vs. overshooting
  backtrackingIndex: number; // Frequency of scrolling back
  targetingAccuracy: number; // Precision in reaching scroll positions
  
  // Reading and attention patterns
  readingSpeed: number; // Inferred from scroll patterns
  attentionSpan: number; // Time spent in content sections
  skimmingBehavior: number; // Fast scrolling suggesting skimming
  detailedReading: number; // Slow, careful scrolling patterns
  
  // Neuromotor indicators in scrolling
  scrollTremor: number; // Irregular scroll movements
  motorControl: number; // Smoothness of scroll execution
  intentionalityIndex: number; // Purposeful vs. exploratory scrolling
  
  // Cognitive load indicators
  scrollHesitation: number; // Pauses before scrolling
  decisionTime: number; // Time between scroll actions
  explorationIndex: number; // Random vs. systematic scrolling
  
  // Fatigue and attention
  scrollFatigue: number; // Progressive changes in behavior
  attentionLapses: number; // Long pauses or erratic scrolling
  engagementLevel: number; // Overall interaction intensity
  
  // Temporal characteristics
  scrollSessionDuration: number;
  totalScrollDistance: number;
  scrollActionCount: number;
  averageScrollDelta: number;
  
  timestamp: number;
}

// Extract basic scroll velocity and movement patterns
const scrollVelocityAnalysis: FeatureDefinition<ScrollEvent[], Partial<ScrollBehaviorFeatures>> = {
  id: 'scroll_velocity',
  name: 'Scroll Velocity Analysis',
  description: 'Analyzes scroll speed, acceleration, and movement characteristics',
  type: 'scroll' as FeatureType,
  version: '1.0.0',
  priority: 100,
  enabled: true,
  compute: (events: ScrollEvent[]) => {
    if (events.length < 3) return {};
    
    const velocities: number[] = [];
    const accelerations: number[] = [];
    const scrollDeltas: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const curr = events[i];
      const prev = events[i - 1];
      const dt = curr.timestamp - prev.timestamp;
      
      if (dt > 0) {
        const deltaDistance = Math.sqrt(
          Math.pow(curr.deltaX, 2) + Math.pow(curr.deltaY, 2)
        );
        const velocity = deltaDistance / (dt / 1000); // pixels/second
        velocities.push(velocity);
        scrollDeltas.push(deltaDistance);
        
        if (i > 1) {
          const prevVelocity = velocities[velocities.length - 2];
          const acceleration = (velocity - prevVelocity) / (dt / 1000);
          accelerations.push(acceleration);
        }
      }
    }
    
    if (velocities.length === 0) return {};
    
    const meanScrollVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const maxScrollVelocity = Math.max(...velocities);
    const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - meanScrollVelocity, 2), 0) / velocities.length;
    
    const scrollAcceleration = accelerations.length > 0 
      ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length 
      : 0;
    
    const averageScrollDelta = scrollDeltas.reduce((a, b) => a + b, 0) / scrollDeltas.length;
    const totalScrollDistance = scrollDeltas.reduce((a, b) => a + b, 0);
    
    return {
      meanScrollVelocity,
      maxScrollVelocity,
      velocityVariance,
      scrollAcceleration,
      averageScrollDelta,
      totalScrollDistance,
      scrollActionCount: events.length,
      timestamp: Date.now()
    };
  },
  validate: (result) => {
    return result.meanScrollVelocity !== undefined && result.meanScrollVelocity >= 0;
  },
  metadata: {
    unit: 'pixels/second',
    range: [0, 5000],
    medicalRelevance: 'medium',
    reliability: 0.80,
    interpretationHints: [
      'Very high velocities may indicate impulsive behavior',
      'Low velocities might suggest motor slowness',
      'High variance indicates inconsistent motor control'
    ]
  }
};

// Extract scroll direction and pattern analysis
const scrollPatternAnalysis: FeatureDefinition<ScrollEvent[], Partial<ScrollBehaviorFeatures>> = {
  id: 'scroll_patterns',
  name: 'Scroll Pattern Analysis',
  description: 'Analyzes scrolling directions, consistency, and behavioral patterns',
  type: 'scroll' as FeatureType,
  version: '1.0.0',
  priority: 90,
  enabled: true,
  compute: (events: ScrollEvent[]) => {
    if (events.length < 5) return {};
    
    let verticalScrolls = 0;
    let horizontalScrolls = 0;
    let directionChanges = 0;
    let backtrackCount = 0;
    
    const scrollAmounts: number[] = [];
    const scrollIntervals: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const curr = events[i];
      const prev = events[i - 1];
      
      // Direction analysis
      if (Math.abs(curr.deltaY) > Math.abs(curr.deltaX)) {
        verticalScrolls++;
      } else if (Math.abs(curr.deltaX) > 0) {
        horizontalScrolls++;
      }
      
      // Direction changes
      if (i > 1) {
        const prevDeltaY = events[i - 1].deltaY;
        const currDeltaY = curr.deltaY;
        
        if ((prevDeltaY > 0 && currDeltaY < 0) || (prevDeltaY < 0 && currDeltaY > 0)) {
          directionChanges++;
        }
      }
      
      // Backtracking detection
      const scrollDistance = Math.abs(curr.scrollTop - prev.scrollTop);
      if (curr.scrollTop < prev.scrollTop && scrollDistance > 50) {
        backtrackCount++;
      }
      
      scrollAmounts.push(scrollDistance);
      scrollIntervals.push(curr.timestamp - prev.timestamp);
    }
    
    const totalScrolls = verticalScrolls + horizontalScrolls;
    const verticalScrollRatio = totalScrolls > 0 ? verticalScrolls / totalScrolls : 0;
    const scrollDirectionChanges = directionChanges / Math.max(1, events.length - 2);
    const backtrackingIndex = backtrackCount / Math.max(1, events.length - 1);
    
    // Scroll consistency: coefficient of variation of scroll amounts
    const meanScrollAmount = scrollAmounts.reduce((a, b) => a + b, 0) / scrollAmounts.length;
    const scrollVariance = scrollAmounts.reduce((sum, s) => sum + Math.pow(s - meanScrollAmount, 2), 0) / scrollAmounts.length;
    const scrollConsistency = meanScrollAmount > 0 ? 1 - (Math.sqrt(scrollVariance) / meanScrollAmount) : 0;
    
    // Scroll rhythm: consistency of timing intervals
    const meanInterval = scrollIntervals.reduce((a, b) => a + b, 0) / scrollIntervals.length;
    const intervalVariance = scrollIntervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) / scrollIntervals.length;
    const scrollRhythm = meanInterval > 0 ? 1 - (Math.sqrt(intervalVariance) / meanInterval) : 0;
    
    return {
      verticalScrollRatio,
      scrollDirectionChanges,
      scrollConsistency,
      scrollRhythm,
      backtrackingIndex,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'medium',
    reliability: 0.75,
    interpretationHints: [
      'High direction changes may indicate indecisiveness or motor control issues',
      'Low consistency suggests irregular motor patterns',
      'Backtracking may indicate memory or attention issues'
    ]
  }
};

// Extract reading and attention patterns from scroll behavior
const readingPatternAnalysis: FeatureDefinition<ScrollEvent[], Partial<ScrollBehaviorFeatures>> = {
  id: 'scroll_reading',
  name: 'Reading Pattern Analysis',
  description: 'Infers reading behavior and attention patterns from scrolling',
  type: 'scroll' as FeatureType,
  version: '1.0.0',
  priority: 85,
  enabled: true,
  compute: (events: ScrollEvent[]) => {
    if (events.length < 10) return {};
    
    // Estimate reading speed based on scroll patterns
    let totalReadingTime = 0;
    let totalContentScrolled = 0;
    let skimmingSections = 0;
    let detailedReadingSections = 0;
    
    const attentionSections: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const curr = events[i];
      const prev = events[i - 1];
      const timeDiff = curr.timestamp - prev.timestamp;
      const scrollDiff = Math.abs(curr.scrollTop - prev.scrollTop);
      
      if (scrollDiff > 0) {
        totalReadingTime += timeDiff;
        totalContentScrolled += scrollDiff;
        
        // Classify reading behavior
        const scrollRate = scrollDiff / Math.max(timeDiff, 1); // pixels per ms
        
        if (scrollRate > 2) { // Fast scrolling = skimming
          skimmingSections++;
        } else if (scrollRate < 0.5) { // Slow scrolling = detailed reading
          detailedReadingSections++;
        }
        
        // Track attention spans (time spent without scrolling much)
        if (scrollDiff < 20 && timeDiff > 1000) {
          attentionSections.push(timeDiff);
        }
      }
    }
    
    const readingSpeed = totalReadingTime > 0 ? totalContentScrolled / totalReadingTime : 0;
    const totalSections = skimmingSections + detailedReadingSections;
    const skimmingBehavior = totalSections > 0 ? skimmingSections / totalSections : 0;
    const detailedReading = totalSections > 0 ? detailedReadingSections / totalSections : 0;
    
    const attentionSpan = attentionSections.length > 0 
      ? attentionSections.reduce((a, b) => a + b, 0) / attentionSections.length 
      : 0;
    
    // Estimate session duration
    const scrollSessionDuration = events.length > 1 
      ? events[events.length - 1].timestamp - events[0].timestamp 
      : 0;
    
    return {
      readingSpeed,
      attentionSpan,
      skimmingBehavior,
      detailedReading,
      scrollSessionDuration,
      timestamp: Date.now()
    };
  },
  metadata: {
    unit: 'pixels/ms for speed, ms for attention',
    medicalRelevance: 'medium',
    reliability: 0.65,
    interpretationHints: [
      'Reading speed patterns may indicate cognitive processing changes',
      'Attention span correlates with focus and concentration',
      'Balance of skimming vs detailed reading shows cognitive strategy'
    ]
  }
};

// Extract neuromotor indicators from scroll behavior
const scrollNeuromotorAnalysis: FeatureDefinition<ScrollEvent[], Partial<ScrollBehaviorFeatures>> = {
  id: 'scroll_neuromotor',
  name: 'Scroll Neuromotor Analysis',
  description: 'Detects motor control and neurological indicators in scrolling behavior',
  type: 'scroll' as FeatureType,
  version: '1.0.0',
  priority: 95,
  enabled: true,
  compute: (events: ScrollEvent[]) => {
    if (events.length < 8) return {};
    
    let tremorIndicators = 0;
    let smoothnessViolations = 0;
    let intentionalMovements = 0;
    let totalMovements = 0;
    
    // Analyze micro-movements for tremor-like patterns
    for (let i = 2; i < events.length - 1; i++) {
      const curr = events[i];
      const prev = events[i - 1];
      const next = events[i + 1];
      const prevPrev = events[i - 2];
      
      const deltaY1 = curr.deltaY;
      const deltaY2 = prev.deltaY;
      const deltaY3 = next.deltaY;
      
      // Tremor detection: look for rapid oscillations
      if ((deltaY1 > 0 && deltaY2 < 0 && deltaY3 > 0) || 
          (deltaY1 < 0 && deltaY2 > 0 && deltaY3 < 0)) {
        const amplitude1 = Math.abs(deltaY1);
        const amplitude2 = Math.abs(deltaY2);
        const amplitude3 = Math.abs(deltaY3);
        
        // Check if amplitudes are similar (consistent oscillation)
        const avgAmplitude = (amplitude1 + amplitude2 + amplitude3) / 3;
        const variance = ((amplitude1 - avgAmplitude) ** 2 + 
                         (amplitude2 - avgAmplitude) ** 2 + 
                         (amplitude3 - avgAmplitude) ** 2) / 3;
        
        if (avgAmplitude > 5 && variance < avgAmplitude * 0.5) {
          tremorIndicators++;
        }
      }
      
      // Smoothness analysis: check for jerky movements
      const timeDiff1 = curr.timestamp - prev.timestamp;
      const timeDiff2 = prev.timestamp - prevPrev.timestamp;
      
      if (timeDiff1 > 0 && timeDiff2 > 0) {
        const velocity1 = Math.abs(deltaY1) / timeDiff1;
        const velocity2 = Math.abs(deltaY2) / timeDiff2;
        
        const velocityChange = Math.abs(velocity1 - velocity2);
        const avgVelocity = (velocity1 + velocity2) / 2;
        
        if (avgVelocity > 0 && velocityChange / avgVelocity > 2) {
          smoothnessViolations++;
        }
      }
      
      // Intentionality: consistent direction and magnitude
      if (Math.abs(deltaY1) > 10) { // Significant movement
        totalMovements++;
        
        // Check if movement is consistent with recent pattern
        const recentDeltas = [deltaY2, events[i - 2]?.deltaY].filter(d => d !== undefined);
        const avgRecentDelta = recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length;
        
        if (Math.sign(deltaY1) === Math.sign(avgRecentDelta) && 
            Math.abs(deltaY1 - avgRecentDelta) < Math.abs(avgRecentDelta) * 0.5) {
          intentionalMovements++;
        }
      }
    }
    
    const scrollTremor = events.length > 3 ? tremorIndicators / (events.length - 3) : 0;
    const motorControl = events.length > 3 ? 1 - (smoothnessViolations / (events.length - 3)) : 1;
    const intentionalityIndex = totalMovements > 0 ? intentionalMovements / totalMovements : 0;
    
    return {
      scrollTremor,
      motorControl: Math.max(0, Math.min(1, motorControl)),
      intentionalityIndex,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'high',
    reliability: 0.70,
    interpretationHints: [
      'Scroll tremor may correlate with motor tremor conditions',
      'Low motor control suggests coordination difficulties',
      'Intentionality reflects goal-directed behavior'
    ]
  }
};

// Extract cognitive load and fatigue indicators
const scrollCognitiveAnalysis: FeatureDefinition<ScrollEvent[], Partial<ScrollBehaviorFeatures>> = {
  id: 'scroll_cognitive',
  name: 'Scroll Cognitive Analysis',
  description: 'Infers cognitive load, fatigue, and attention from scroll patterns',
  type: 'scroll' as FeatureType,
  version: '1.0.0',
  priority: 80,
  enabled: true,
  compute: (events: ScrollEvent[]) => {
    if (events.length < 12) return {};
    
    const intervals: number[] = [];
    const scrollMagnitudes: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const curr = events[i];
      const prev = events[i - 1];
      intervals.push(curr.timestamp - prev.timestamp);
      scrollMagnitudes.push(Math.abs(curr.deltaY));
    }
    
    // Hesitation detection: pauses before scrolling
    const longPauses = intervals.filter(i => i > 1500); // > 1.5 seconds
    const scrollHesitation = longPauses.length / intervals.length;
    
    // Decision time: average time between scroll actions
    const decisionTime = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Exploration vs systematic scrolling
    let explorationMovements = 0;
    let systematicMovements = 0;
    
    for (let i = 2; i < events.length; i++) {
      const curr = events[i];
      const prev = events[i - 1];
      const prevPrev = events[i - 2];
      
      // Check if scroll direction is consistent (systematic)
      const dir1 = Math.sign(curr.deltaY);
      const dir2 = Math.sign(prev.deltaY);
      const dir3 = Math.sign(prevPrev.deltaY);
      
      if (dir1 === dir2 && dir2 === dir3 && dir1 !== 0) {
        systematicMovements++;
      } else if (dir1 !== 0) {
        explorationMovements++;
      }
    }
    
    const totalDirectionalMovements = explorationMovements + systematicMovements;
    const explorationIndex = totalDirectionalMovements > 0 
      ? explorationMovements / totalDirectionalMovements 
      : 0.5;
    
    // Fatigue analysis: compare first half vs second half
    const midPoint = Math.floor(intervals.length / 2);
    const firstHalfIntervals = intervals.slice(0, midPoint);
    const secondHalfIntervals = intervals.slice(midPoint);
    
    const firstHalfAvg = firstHalfIntervals.reduce((a, b) => a + b, 0) / firstHalfIntervals.length;
    const secondHalfAvg = secondHalfIntervals.reduce((a, b) => a + b, 0) / secondHalfIntervals.length;
    
    const scrollFatigue = firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0;
    
    // Attention lapses: very long pauses or erratic behavior
    const veryLongPauses = intervals.filter(i => i > 5000); // > 5 seconds
    const attentionLapses = veryLongPauses.length / intervals.length;
    
    // Engagement level: based on activity consistency
    const scrollVariance = intervals.reduce((sum, i) => {
      const mean = decisionTime;
      return sum + Math.pow(i - mean, 2);
    }, 0) / intervals.length;
    const scrollCV = Math.sqrt(scrollVariance) / decisionTime;
    const engagementLevel = Math.max(0, 1 - scrollCV); // Lower variance = higher engagement
    
    return {
      scrollHesitation,
      decisionTime,
      explorationIndex,
      scrollFatigue,
      attentionLapses,
      engagementLevel: Math.max(0, Math.min(1, engagementLevel)),
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'medium',
    reliability: 0.65,
    interpretationHints: [
      'High hesitation may indicate decision-making difficulties',
      'Exploration vs systematic patterns reflect cognitive strategies',
      'Fatigue progression may indicate attention or motor decline'
    ]
  }
};

/**
 * Register all scroll features with the feature registry
 */
export function registerScrollFeatures(): void {
  try {
    featureRegistry.register(scrollVelocityAnalysis);
    featureRegistry.register(scrollPatternAnalysis);
    featureRegistry.register(readingPatternAnalysis);
    featureRegistry.register(scrollNeuromotorAnalysis);
    featureRegistry.register(scrollCognitiveAnalysis);
    
    logger.info('Scroll features registered successfully', { 
      featureCount: 5,
      types: ['velocity', 'patterns', 'reading', 'neuromotor', 'cognitive']
    });
  } catch (error) {
    logger.error('Failed to register scroll features', { error });
    throw error;
  }
}

/**
 * Utility function to compute all scroll features from events
 */
export async function computeScrollFeatures(events: ScrollEvent[], sessionId: string): Promise<ScrollBehaviorFeatures> {
  const scrollFeatures = featureRegistry.getByType('scroll');
  const results: Partial<ScrollBehaviorFeatures> = { timestamp: Date.now() };
  
  for (const feature of scrollFeatures) {
    try {
      const partial = await feature.compute(events);
      Object.assign(results, partial);
    } catch (error) {
      logger.error('Scroll feature computation failed', { 
        featureId: feature.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return results as ScrollBehaviorFeatures;
}
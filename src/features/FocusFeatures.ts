/* eslint-disable no-trailing-spaces */
import { FeatureDefinition, featureRegistry, FeatureType } from './FeatureRegistry';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('FocusFeatures');

export interface FocusEvent {
  timestamp: number;
  type: 'focus' | 'blur' | 'visibility_change' | 'tab_switch' | 'window_focus' | 'window_blur';
  target?: string; // Element identifier
  duration?: number; // For focus events
  isVisible: boolean;
  isActive: boolean;
}

export interface AttentionMetrics {
  timestamp: number;
  focusDuration: number;
  idleDuration: number;
  activityLevel: number; // 0-1 scale
  interactionDensity: number; // Events per minute
  multitaskingIndicator: number; // Tab switching frequency
}

export interface FocusAttentionFeatures {
  // Basic attention metrics
  totalFocusTime: number;
  totalBlurTime: number;
  focusRatio: number; // Time in focus / total time
  averageFocusDuration: number;
  
  // Attention stability
  focusFragmentation: number; // Frequency of focus switches
  attentionSpan: number; // Longest continuous focus period
  sustainedAttentionIndex: number; // Ability to maintain focus
  
  // Distraction and multitasking
  distractionFrequency: number; // Focus losses per minute
  multitaskingIndex: number; // Tab/window switching behavior
  contextSwitchingCost: number; // Time lost to switching
  
  // Cognitive load indicators
  focusStability: number; // Variance in focus durations
  attentionalControl: number; // Ability to maintain focus under load
  cognitiveFlexibility: number; // Adaptive switching behavior
  
  // Temporal patterns
  focusRhythm: number; // Regularity of attention cycles
  attentionCycles: number; // Number of focus/blur cycles
  peakAttentionPeriods: number; // Sustained high-focus episodes
  
  // Fatigue and decline
  attentionFatigue: number; // Progressive decline in focus
  vigilanceDecrement: number; // Attention degradation over time
  recoveryEfficiency: number; // Speed of attention recovery
  
  // Activity correlation
  activityFocusCorrelation: number; // How activity correlates with focus
  idlenessToleranceIndex: number; // Comfort with inactivity
  stimulationSeeking: number; // Tendency to seek new stimuli
  
  // Advanced attention metrics
  executiveAttention: number; // Control and monitoring
  alertingNetwork: number; // Readiness to respond
  orientingNetwork: number; // Direction of attention
  
  // Summary statistics
  sessionDuration: number;
  totalFocusEvents: number;
  totalBlurEvents: number;
  averageActivityLevel: number;
  
  timestamp: number;
}

// Extract basic focus timing and patterns
const basicFocusAnalysis: FeatureDefinition<FocusEvent[], Partial<FocusAttentionFeatures>> = {
  id: 'focus_basic',
  name: 'Basic Focus Analysis',
  description: 'Fundamental focus timing and attention patterns',
  type: 'focus' as FeatureType,
  version: '1.0.0',
  priority: 100,
  enabled: true,
  compute: (events: FocusEvent[]) => {
    if (events.length < 2) return {};
    
    let totalFocusTime = 0;
    let totalBlurTime = 0;
    let focusEvents = 0;
    let blurEvents = 0;
    
    const focusDurations: number[] = [];
    let currentFocusStart: number | null = null;
    
    // Process events chronologically
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    
    for (const event of sortedEvents) {
      switch (event.type) {
        case 'focus':
        case 'window_focus':
          focusEvents++;
          currentFocusStart = event.timestamp;
          break;
          
        case 'blur':
        case 'window_blur':
          blurEvents++;
          if (currentFocusStart) {
            const focusDuration = event.timestamp - currentFocusStart;
            focusDurations.push(focusDuration);
            totalFocusTime += focusDuration;
            currentFocusStart = null;
          }
          break;
          
        case 'visibility_change':
          if (!event.isVisible && currentFocusStart) {
            const focusDuration = event.timestamp - currentFocusStart;
            focusDurations.push(focusDuration);
            totalFocusTime += focusDuration;
            currentFocusStart = null;
          } else if (event.isVisible) {
            currentFocusStart = event.timestamp;
          }
          break;
      }
    }
    
    // Handle session end
    if (currentFocusStart && sortedEvents.length > 0) {
      const sessionEnd = sortedEvents[sortedEvents.length - 1].timestamp;
      const finalFocusDuration = sessionEnd - currentFocusStart;
      focusDurations.push(finalFocusDuration);
      totalFocusTime += finalFocusDuration;
    }
    
    const sessionStart = sortedEvents[0].timestamp;
    const sessionEnd = sortedEvents[sortedEvents.length - 1].timestamp;
    const sessionDuration = sessionEnd - sessionStart;
    
    totalBlurTime = sessionDuration - totalFocusTime;
    
    const focusRatio = sessionDuration > 0 ? totalFocusTime / sessionDuration : 0;
    const averageFocusDuration = focusDurations.length > 0 
      ? focusDurations.reduce((a, b) => a + b, 0) / focusDurations.length 
      : 0;
    
    const attentionSpan = focusDurations.length > 0 ? Math.max(...focusDurations) : 0;
    const attentionCycles = Math.floor((focusEvents + blurEvents) / 2);
    
    return {
      totalFocusTime,
      totalBlurTime,
      focusRatio,
      averageFocusDuration,
      attentionSpan,
      attentionCycles,
      sessionDuration,
      totalFocusEvents: focusEvents,
      totalBlurEvents: blurEvents,
      timestamp: Date.now()
    };
  },
  validate: (result) => {
    return result.sessionDuration !== undefined && result.sessionDuration >= 0;
  },
  metadata: {
    unit: 'milliseconds',
    medicalRelevance: 'high',
    reliability: 0.90,
    interpretationHints: [
      'Lower focus ratios may indicate attention difficulties',
      'Short average focus durations suggest distractibility',
      'Attention span measures sustained attention capacity'
    ]
  }
};

// Extract distraction and multitasking patterns
const distractionAnalysis: FeatureDefinition<FocusEvent[], Partial<FocusAttentionFeatures>> = {
  id: 'focus_distraction',
  name: 'Distraction Analysis',
  description: 'Analyzes distraction patterns and multitasking behavior',
  type: 'focus' as FeatureType,
  version: '1.0.0',
  priority: 90,
  enabled: true,
  compute: (events: FocusEvent[]) => {
    if (events.length < 5) return {};
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const sessionDuration = sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp;
    
    let focusSwitches = 0;
    let tabSwitches = 0;
    let contextSwitchTime = 0;
    
    const focusDurations: number[] = [];
    let lastFocusStart: number | null = null;
    
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const nextEvent = i + 1 < sortedEvents.length ? sortedEvents[i + 1] : null;
      
      // Count focus switches
      if (event.type === 'blur' && nextEvent?.type === 'focus') {
        focusSwitches++;
        
        // Measure context switching cost
        const switchTime = nextEvent.timestamp - event.timestamp;
        contextSwitchTime += switchTime;
      }
      
      // Count tab/window switches
      if (event.type === 'tab_switch' || event.type === 'window_blur') {
        tabSwitches++;
      }
      
      // Track focus durations for fragmentation analysis
      if (event.type === 'focus') {
        lastFocusStart = event.timestamp;
      } else if (event.type === 'blur' && lastFocusStart) {
        focusDurations.push(event.timestamp - lastFocusStart);
        lastFocusStart = null;
      }
    }
    
    const sessionMinutes = sessionDuration / 60000;
    const distractionFrequency = sessionMinutes > 0 ? focusSwitches / sessionMinutes : 0;
    const multitaskingIndex = sessionMinutes > 0 ? tabSwitches / sessionMinutes : 0;
    const contextSwitchingCost = focusSwitches > 0 ? contextSwitchTime / focusSwitches : 0;
    
    // Focus fragmentation: coefficient of variation of focus durations
    let focusFragmentation = 0;
    if (focusDurations.length > 1) {
      const meanDuration = focusDurations.reduce((a, b) => a + b, 0) / focusDurations.length;
      const variance = focusDurations.reduce((sum, d) => sum + Math.pow(d - meanDuration, 2), 0) / focusDurations.length;
      focusFragmentation = meanDuration > 0 ? Math.sqrt(variance) / meanDuration : 0;
    }
    
    return {
      distractionFrequency,
      multitaskingIndex,
      contextSwitchingCost,
      focusFragmentation,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 10],
    medicalRelevance: 'high',
    reliability: 0.85,
    interpretationHints: [
      'High distraction frequency indicates attention control issues',
      'Excessive multitasking may suggest executive dysfunction',
      'Long context switching costs indicate cognitive inflexibility'
    ]
  }
};

// Extract attention stability and control metrics
const attentionStabilityAnalysis: FeatureDefinition<FocusEvent[], Partial<FocusAttentionFeatures>> = {
  id: 'focus_stability',
  name: 'Attention Stability Analysis',
  description: 'Measures attention stability and cognitive control',
  type: 'focus' as FeatureType,
  version: '1.0.0',
  priority: 95,
  enabled: true,
  compute: (events: FocusEvent[]) => {
    if (events.length < 8) return {};
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    
    let sustainedPeriods = 0;
    let totalSustainedTime = 0;
    const focusIntervals: number[] = [];
    let currentFocusStart: number | null = null;
    
    // Minimum sustained attention threshold (30 seconds)
    const sustainedThreshold = 30000;
    
    for (const event of sortedEvents) {
      if (event.type === 'focus' || (event.type === 'visibility_change' && event.isVisible)) {
        currentFocusStart = event.timestamp;
      } else if (event.type === 'blur' || (event.type === 'visibility_change' && !event.isVisible)) {
        if (currentFocusStart) {
          const focusDuration = event.timestamp - currentFocusStart;
          focusIntervals.push(focusDuration);
          
          if (focusDuration >= sustainedThreshold) {
            sustainedPeriods++;
            totalSustainedTime += focusDuration;
          }
          
          currentFocusStart = null;
        }
      }
    }
    
    // Calculate sustained attention index
    const totalFocusTime = focusIntervals.reduce((a, b) => a + b, 0);
    const sustainedAttentionIndex = totalFocusTime > 0 ? totalSustainedTime / totalFocusTime : 0;
    
    // Focus stability: inverse of coefficient of variation
    let focusStability = 0;
    if (focusIntervals.length > 1) {
      const meanInterval = focusIntervals.reduce((a, b) => a + b, 0) / focusIntervals.length;
      const variance = focusIntervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) / focusIntervals.length;
      const coefficientOfVariation = meanInterval > 0 ? Math.sqrt(variance) / meanInterval : 1;
      focusStability = 1 / (1 + coefficientOfVariation);
    }
    
    // Attentional control: based on ability to maintain focus despite potential distractions
    const rapidSwitches = focusIntervals.filter(interval => interval < 5000).length; // < 5 seconds
    const attentionalControl = focusIntervals.length > 0 ? 1 - (rapidSwitches / focusIntervals.length) : 0;
    
    // Cognitive flexibility: appropriate switching vs. perseveration
    const moderateFocusPeriods = focusIntervals.filter(interval => interval >= 5000 && interval <= 300000).length;
    const cognitiveFlexibility = focusIntervals.length > 0 ? moderateFocusPeriods / focusIntervals.length : 0;
    
    const peakAttentionPeriods = sustainedPeriods;
    
    return {
      sustainedAttentionIndex,
      focusStability,
      attentionalControl,
      cognitiveFlexibility,
      peakAttentionPeriods,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [0, 1],
    medicalRelevance: 'critical',
    reliability: 0.80,
    interpretationHints: [
      'Low sustained attention may indicate ADHD or attention disorders',
      'Poor focus stability suggests attention regulation difficulties',
      'Cognitive flexibility measures adaptive control'
    ]
  }
};

// Extract fatigue and vigilance patterns
const vigilanceAnalysis: FeatureDefinition<FocusEvent[], Partial<FocusAttentionFeatures>> = {
  id: 'focus_vigilance',
  name: 'Vigilance and Fatigue Analysis',
  description: 'Analyzes attention fatigue and vigilance decrements over time',
  type: 'focus' as FeatureType,
  version: '1.0.0',
  priority: 85,
  enabled: true,
  compute: (events: FocusEvent[]) => {
    if (events.length < 10) return {};
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const sessionDuration = sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp;
    
    // Divide session into segments to analyze temporal changes
    const segments = 4;
    const segmentDuration = sessionDuration / segments;
    const segmentMetrics: Array<{ focusTime: number; switches: number }> = [];
    
    for (let i = 0; i < segments; i++) {
      const segmentStart = sortedEvents[0].timestamp + (i * segmentDuration);
      const segmentEnd = segmentStart + segmentDuration;
      
      const segmentEvents = sortedEvents.filter(
        event => event.timestamp >= segmentStart && event.timestamp < segmentEnd
      );
      
      let focusTime = 0;
      let switches = 0;
      let currentFocusStart: number | null = null;
      
      for (const event of segmentEvents) {
        if (event.type === 'focus') {
          currentFocusStart = event.timestamp;
        } else if (event.type === 'blur') {
          switches++;
          if (currentFocusStart) {
            focusTime += event.timestamp - currentFocusStart;
            currentFocusStart = null;
          }
        }
      }
      
      segmentMetrics.push({ focusTime, switches });
    }
    
    // Calculate vigilance decrement (decline in performance over time)
    const firstSegmentFocusRatio = segmentMetrics[0].focusTime / segmentDuration;
    const lastSegmentFocusRatio = segmentMetrics[segments - 1].focusTime / segmentDuration;
    const vigilanceDecrement = firstSegmentFocusRatio > 0 
      ? (firstSegmentFocusRatio - lastSegmentFocusRatio) / firstSegmentFocusRatio 
      : 0;
    
    // Calculate attention fatigue (progressive increase in switching)
    const firstHalfSwitches = segmentMetrics.slice(0, segments / 2).reduce((sum, s) => sum + s.switches, 0);
    const secondHalfSwitches = segmentMetrics.slice(segments / 2).reduce((sum, s) => sum + s.switches, 0);
    const attentionFatigue = firstHalfSwitches > 0 
      ? (secondHalfSwitches - firstHalfSwitches) / firstHalfSwitches 
      : 0;
    
    // Recovery efficiency: how quickly focus is regained after breaks
  const recoveryTimes: number[] = [];
    let lastBlurTime: number | null = null;
    
    for (const event of sortedEvents) {
      if (event.type === 'blur') {
        lastBlurTime = event.timestamp;
      } else if (event.type === 'focus' && lastBlurTime) {
        recoveryTimes.push(event.timestamp - lastBlurTime);
        lastBlurTime = null;
      }
    }
    
    const recoveryEfficiency = recoveryTimes.length > 0 
      ? 1 / (recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length / 1000) // Inverse of average recovery time in seconds
      : 0;
    
    return {
      vigilanceDecrement: Math.max(-1, Math.min(1, vigilanceDecrement)),
      attentionFatigue: Math.max(-1, Math.min(2, attentionFatigue)),
      recoveryEfficiency: Math.max(0, Math.min(1, recoveryEfficiency)),
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [-1, 2],
    medicalRelevance: 'medium',
    reliability: 0.75,
    interpretationHints: [
      'Positive vigilance decrement indicates attention decline over time',
      'Attention fatigue may suggest cognitive overload',
      'Low recovery efficiency indicates attention switching difficulties'
    ]
  }
};

// Extract activity correlation analysis
// NOTE: Removed invalid dependency on 'attention_metrics' (not implemented) which caused
// registry registration to throw and prevented ALL focus features from registering.
// Correlation feature is computed manually with provided attentionMetrics input.
const activityCorrelationAnalysis: FeatureDefinition<{focusEvents: FocusEvent[], attentionMetrics: AttentionMetrics[]}, Partial<FocusAttentionFeatures>> = {
  id: 'focus_activity_correlation',
  name: 'Focus-Activity Correlation',
  description: 'Analyzes correlation between focus states and activity levels',
  type: 'focus' as FeatureType,
  version: '1.0.0',
  priority: 70,
  enabled: true,
  compute: (input: {focusEvents: FocusEvent[], attentionMetrics: AttentionMetrics[]}) => {
    const { focusEvents, attentionMetrics } = input;
    
    if (focusEvents.length < 5 || attentionMetrics.length < 3) return {};
    
    // Align focus states with activity metrics
    const alignedData: Array<{isFocused: boolean, activityLevel: number}> = [];
    
    let currentFocusState = false;
    let focusEventIndex = 0;
    
    for (const metric of attentionMetrics) {
      // Update focus state based on events up to this timestamp
      while (focusEventIndex < focusEvents.length && 
             focusEvents[focusEventIndex].timestamp <= metric.timestamp) {
        const event = focusEvents[focusEventIndex];
        currentFocusState = event.type === 'focus' || 
                           (event.type === 'visibility_change' && event.isVisible);
        focusEventIndex++;
      }
      
      alignedData.push({
        isFocused: currentFocusState,
        activityLevel: metric.activityLevel
      });
    }
    
    // Calculate correlation between focus and activity
    const focusedData = alignedData.filter(d => d.isFocused);
    const unfocusedData = alignedData.filter(d => !d.isFocused);
    
    const avgFocusedActivity = focusedData.length > 0 
      ? focusedData.reduce((sum, d) => sum + d.activityLevel, 0) / focusedData.length 
      : 0;
    const avgUnfocusedActivity = unfocusedData.length > 0 
      ? unfocusedData.reduce((sum, d) => sum + d.activityLevel, 0) / unfocusedData.length 
      : 0;
    
    const activityFocusCorrelation = avgFocusedActivity - avgUnfocusedActivity;
    
    // Idleness tolerance: comfort with low activity periods
    const lowActivityPeriods = attentionMetrics.filter(m => m.activityLevel < 0.3);
    const idlenessToleranceIndex = attentionMetrics.length > 0 
      ? lowActivityPeriods.length / attentionMetrics.length 
      : 0;
    
    // Stimulation seeking: tendency to increase activity when unfocused
    let stimulationSeekingEvents = 0;
    for (let i = 1; i < alignedData.length; i++) {
      const curr = alignedData[i];
      const prev = alignedData[i - 1];
      
      if (!prev.isFocused && curr.activityLevel > prev.activityLevel + 0.2) {
        stimulationSeekingEvents++;
      }
    }
    
    const stimulationSeeking = alignedData.length > 1 
      ? stimulationSeekingEvents / (alignedData.length - 1) 
      : 0;
    
    const averageActivityLevel = attentionMetrics.reduce((sum, m) => sum + m.activityLevel, 0) / attentionMetrics.length;
    
    return {
      activityFocusCorrelation,
      idlenessToleranceIndex,
      stimulationSeeking,
      averageActivityLevel,
      timestamp: Date.now()
    };
  },
  metadata: {
    range: [-1, 1],
    medicalRelevance: 'medium',
    reliability: 0.70,
    interpretationHints: [
      'Positive correlation suggests focus improves with activity',
      'Low idleness tolerance may indicate restlessness',
      'High stimulation seeking suggests attention regulation difficulties'
    ]
  }
};

/**
 * Register all focus features with the feature registry
 */
export function registerFocusFeatures(): void {
  const toRegister = [
    basicFocusAnalysis,
    distractionAnalysis,
    attentionStabilityAnalysis,
    vigilanceAnalysis,
    activityCorrelationAnalysis
  ];
  let success = 0;
  for (const def of toRegister) {
    try {
      featureRegistry.register(def as any);
      success++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('Focus feature registration failed', { featureId: def.id, error: msg });
    }
  }
  logger.info('Focus feature registration completed', { attempted: toRegister.length, success });
}

/**
 * Utility function to compute all focus features from events and metrics
 */
export async function computeFocusFeatures(
  focusEvents: FocusEvent[], 
  attentionMetrics: AttentionMetrics[] = [],
  sessionId: string
): Promise<FocusAttentionFeatures> {
  const focusFeatures = featureRegistry.getByType('focus');
  const results: Partial<FocusAttentionFeatures> = { timestamp: Date.now() };
  
  for (const feature of focusFeatures) {
    try {
      let input: any = focusEvents;
      
      // Handle features that need additional dependencies
      if (feature.id === 'focus_activity_correlation') {
        input = { focusEvents, attentionMetrics };
      }
      
      const partial = await feature.compute(input);
      Object.assign(results, partial);
    } catch (error) {
      logger.error('Focus feature computation failed', { 
        featureId: feature.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return results as FocusAttentionFeatures;
}
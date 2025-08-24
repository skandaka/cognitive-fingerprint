/* eslint-disable no-trailing-spaces */
import { BaselinePattern, FeatureSnapshot, BaselineModeling } from './BaselineModeling';
import { SimilarityScore, SimilarityScoring } from './SimilarityScoring';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('AdaptiveRecognition');

export interface DriftDetection {
  isDrifting: boolean;
  driftType: DriftType;
  driftSeverity: 'minimal' | 'mild' | 'moderate' | 'significant' | 'severe';
  confidence: number; // 0-1
  detectedAt: number;
  
  // Drift characteristics
  affectedModalities: string[];
  primaryFeatures: string[]; // Features showing strongest drift
  driftDirection: 'improvement' | 'deterioration' | 'change';
  
  // Statistical measures
  driftMagnitude: number; // Overall magnitude of drift
  driftRate: number; // Rate of change per day
  stabilityMetrics: {
    variance: number;
    trend: number; // -1 to 1, negative = declining
    volatility: number; // Measure of erratic changes
  };
  
  // Medical interpretation
  medicalSignificance: 'none' | 'monitoring' | 'clinical_attention' | 'immediate_review';
  likelyDiseaseProgression: boolean;
  recommendedActions: string[];
  
  // Metadata
  metadata: {
    detectionMethod: string;
    baselinePeriod: [number, number]; // Start and end timestamps
    observationPeriod: [number, number];
    sampleCount: number;
    lastUpdated: number;
  };
}

export type DriftType = 
  | 'gradual_decline'    // Slow progressive deterioration
  | 'sudden_change'      // Abrupt shift in patterns  
  | 'cyclic_variation'   // Regular cyclical changes
  | 'erratic_behavior'   // Irregular, unpredictable changes
  | 'recovery'           // Improvement from previous decline
  | 'adaptation'         // Learning/adaptation to system
  | 'environmental'      // Changes due to external factors
  | 'technical';         // Technical issues/artifacts

export interface PatternEvolution {
  userId: string;
  timepoint: number;
  evolutionType: 'baseline_establishment' | 'stable_period' | 'drift_detected' | 'adaptation_complete';
  
  // Pattern characteristics at this timepoint
  dominantPatterns: {
    neuromotor: number; // 0-1 score
    cognitive: number;
    temporal: number;
    behavioral: number;
  };
  
  // Change indicators
  changeVector: {
    magnitude: number;
    direction: string; // Description of primary change direction
    acceleration: number; // Rate of change in change (second derivative)
  };
  
  // Confidence in assessment
  assessmentConfidence: number;
  
  // Context
  contextFactors: string[]; // Environmental or situational factors
}

export interface AdaptationStrategy {
  strategyType: 'baseline_update' | 'threshold_adjustment' | 'model_retraining' | 'feature_weighting';
  triggerCondition: string;
  adaptationStrength: number; // 0-1, how much to adapt
  safeguards: string[]; // Conditions that prevent adaptation
}

export interface RecognitionState {
  userId: string;
  currentBaseline: BaselinePattern;
  recentScores: SimilarityScore[];
  driftHistory: DriftDetection[];
  evolutionHistory: PatternEvolution[];
  
  // State tracking
  lastDriftCheck: number;
  adaptationScheduled: boolean;
  monitoringMode: 'normal' | 'enhanced' | 'clinical';
  
  // Statistics
  statistics: {
    totalSessions: number;
    driftDetectionCount: number;
    adaptationCount: number;
    avgSimilarityScore: number;
    stabilityTrend: number;
  };
}

export class AdaptiveRecognition {
  private static instance: AdaptiveRecognition;
  private recognitionStates = new Map<string, RecognitionState>();
  private baselineModeling = BaselineModeling.getInstance();
  private similarityScoring = SimilarityScoring.getInstance();
  
  // Configuration
  private config = {
    driftDetectionWindow: 10, // Number of recent scores to analyze
    driftThresholds: {
      minimal: 0.05,   // 5% change
      mild: 0.10,      // 10% change  
      moderate: 0.20,  // 20% change
      significant: 0.35, // 35% change
      severe: 0.50     // 50% change
    },
    adaptationTriggers: {
      consistentDrift: 5,    // Sessions showing consistent drift
      severeDrift: 2,        // Sessions with severe drift
      medicalSignificance: 1 // Any medically significant drift
    },
    monitoringIntervals: {
      normal: 24 * 60 * 60 * 1000,     // 24 hours
      enhanced: 8 * 60 * 60 * 1000,    // 8 hours
      clinical: 2 * 60 * 60 * 1000     // 2 hours
    }
  };

  private constructor() {}

  static getInstance(): AdaptiveRecognition {
    if (!AdaptiveRecognition.instance) {
      AdaptiveRecognition.instance = new AdaptiveRecognition();
    }
    return AdaptiveRecognition.instance;
  }

  /**
   * Process new similarity score and check for drift
   */
  async processNewScore(userId: string, score: SimilarityScore): Promise<DriftDetection | null> {
    let state = this.recognitionStates.get(userId);
    
    if (!state) {
      // Initialize state for new user
      const baseline = this.baselineModeling.getBaseline(userId);
      if (!baseline) {
        logger.warn('No baseline available for drift detection', { userId });
        return null;
      }
      
      state = this.initializeRecognitionState(userId, baseline);
      this.recognitionStates.set(userId, state);
    }

    // Add score to history
    state.recentScores.push(score);
    
    // Maintain rolling window
    const maxScores = this.config.driftDetectionWindow * 2;
    if (state.recentScores.length > maxScores) {
      state.recentScores = state.recentScores.slice(-maxScores);
    }

    // Update statistics
    this.updateStateStatistics(state);

    // Check for drift if we have enough data
    let drift: DriftDetection | null = null;
    if (state.recentScores.length >= this.config.driftDetectionWindow) {
      drift = await this.detectDrift(state);
      
      if (drift && drift.isDrifting) {
        state.driftHistory.push(drift);
        await this.handleDriftDetection(state, drift);
      }
    }

    // Update monitoring mode based on recent activity
    this.updateMonitoringMode(state);

    // Record pattern evolution
    const evolution = this.analyzePatternEvolution(state, score);
    state.evolutionHistory.push(evolution);

    // Cleanup old history
    this.cleanupHistory(state);

    state.lastDriftCheck = Date.now();
    
    logger.debug('Processed similarity score for adaptive recognition', {
      userId,
      overallScore: score.overall,
      isDrifting: drift?.isDrifting || false,
      monitoringMode: state.monitoringMode
    });

    return drift;
  }

  /**
   * Detect drift in recent similarity scores
   */
  private async detectDrift(state: RecognitionState): Promise<DriftDetection | null> {
    const recentScores = state.recentScores.slice(-this.config.driftDetectionWindow);
    
    if (recentScores.length < this.config.driftDetectionWindow) {
      return null;
    }

    // Statistical analysis of score trends
    const scores = recentScores.map(s => s.overall);
    const timestamps = recentScores.map(s => s.timestamp);
    
    const trendAnalysis = this.analyzeTrend(scores, timestamps);
    const variabilityAnalysis = this.analyzeVariability(scores);
    const changePointAnalysis = this.detectChangePoints(scores, timestamps);
    
    // Determine if drift is occurring
    const isDrifting = this.evaluateDriftConditions(
      trendAnalysis,
      variabilityAnalysis,
      changePointAnalysis
    );

    if (!isDrifting) {
      return null;
    }

    // Characterize the drift
    const driftType = this.classifyDriftType(trendAnalysis, variabilityAnalysis, changePointAnalysis);
    const driftSeverity = this.assessDriftSeverity(trendAnalysis.magnitude, variabilityAnalysis.volatility);
    const affectedModalities = this.identifyAffectedModalities(recentScores);
    const primaryFeatures = this.identifyPrimaryDriftFeatures(recentScores);
    const driftDirection = this.determineDriftDirection(trendAnalysis.direction);
    
    // Calculate drift metrics
    const driftMagnitude = Math.abs(trendAnalysis.magnitude);
    const driftRate = this.calculateDriftRate(scores, timestamps);
    
    // Assess medical significance
    const medicalAssessment = this.assessMedicalSignificance(
      driftType, 
      driftSeverity, 
      affectedModalities,
      primaryFeatures
    );

    // Calculate confidence
    const confidence = this.calculateDriftConfidence(
      trendAnalysis,
      variabilityAnalysis,
      recentScores
    );

    const drift: DriftDetection = {
      isDrifting: true,
      driftType,
      driftSeverity,
      confidence,
      detectedAt: Date.now(),
      
      affectedModalities,
      primaryFeatures,
      driftDirection,
      
      driftMagnitude,
      driftRate,
      stabilityMetrics: {
        variance: variabilityAnalysis.variance,
        trend: trendAnalysis.direction,
        volatility: variabilityAnalysis.volatility
      },
      
      medicalSignificance: medicalAssessment.significance,
      likelyDiseaseProgression: medicalAssessment.likelyProgression,
      recommendedActions: medicalAssessment.actions,
      
      metadata: {
        detectionMethod: 'statistical_trend_analysis',
        baselinePeriod: [state.currentBaseline.timestamp, state.currentBaseline.timestamp],
        observationPeriod: [timestamps[0], timestamps[timestamps.length - 1]],
        sampleCount: recentScores.length,
        lastUpdated: Date.now()
      }
    };

    return drift;
  }

  /**
   * Analyze trend in similarity scores
   */
  private analyzeTrend(scores: number[], timestamps: number[]): {
    direction: number; // -1 to 1
    magnitude: number; // 0 to 1
    consistency: number; // 0 to 1
    acceleration: number; // Rate of change in rate of change
  } {
    if (scores.length < 3) {
      return { direction: 0, magnitude: 0, consistency: 0, acceleration: 0 };
    }

    // Simple linear regression
    const n = scores.length;
    const sumX = timestamps.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumXX = timestamps.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Normalize slope to daily change rate
    const msPerDay = 24 * 60 * 60 * 1000;
    const dailyChangeRate = slope * msPerDay;
    
    // Direction: -1 (declining) to 1 (improving)
    const direction = Math.max(-1, Math.min(1, dailyChangeRate * 10)); // Scale for reasonable range
    
    // Magnitude: how much change overall
    const magnitude = Math.abs(scores[scores.length - 1] - scores[0]);
    
    // Consistency: how well does linear model fit
    const predictions = timestamps.map(t => slope * t + intercept);
    const residuals = scores.map((score, i) => score - predictions[i]);
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - (sumY / n), 2), 0) / n;
    const rSquared = variance > 0 ? 1 - (mse / variance) : 0;
    const consistency = Math.max(0, rSquared);
    
    // Acceleration: second derivative approximation
    let acceleration = 0;
    if (scores.length >= 5) {
      const midpoint = Math.floor(scores.length / 2);
      const firstHalf = scores.slice(0, midpoint);
      const secondHalf = scores.slice(midpoint);
      
      const firstHalfTrend = firstHalf.length > 1 
        ? (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf.length
        : 0;
      const secondHalfTrend = secondHalf.length > 1
        ? (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf.length
        : 0;
      
      acceleration = secondHalfTrend - firstHalfTrend;
    }

    return { direction, magnitude, consistency, acceleration };
  }

  /**
   * Analyze variability in similarity scores
   */
  private analyzeVariability(scores: number[]): {
    variance: number;
    volatility: number; // Measure of erratic changes
    stability: number; // 0-1, higher is more stable
  } {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    
    // Volatility: measure of period-to-period changes
    let volatility = 0;
    for (let i = 1; i < scores.length; i++) {
      volatility += Math.abs(scores[i] - scores[i - 1]);
    }
    volatility = scores.length > 1 ? volatility / (scores.length - 1) : 0;
    
    // Stability: inverse of coefficient of variation
    const stability = mean > 0 ? 1 / (1 + Math.sqrt(variance) / mean) : 0;

    return { variance, volatility, stability };
  }

  /**
   * Detect change points in the score series
   */
  private detectChangePoints(scores: number[], timestamps: number[]): {
    hasChangePoint: boolean;
    changePointIndex?: number;
    preChangeScore?: number;
    postChangeScore?: number;
    changePointTimestamp?: number;
  } {
    if (scores.length < 6) {
      return { hasChangePoint: false };
    }

    let maxDifference = 0;
    let changePointIndex = -1;

    // Simple change point detection using cumulative sum
    for (let i = 2; i < scores.length - 2; i++) {
      const beforeMean = scores.slice(0, i).reduce((a, b) => a + b, 0) / i;
      const afterMean = scores.slice(i).reduce((a, b) => a + b, 0) / (scores.length - i);
      const difference = Math.abs(afterMean - beforeMean);
      
      if (difference > maxDifference) {
        maxDifference = difference;
        changePointIndex = i;
      }
    }

    // Threshold for significant change point
    if (maxDifference > 0.15) { // 15% change
      return {
        hasChangePoint: true,
        changePointIndex,
        preChangeScore: scores.slice(0, changePointIndex).reduce((a, b) => a + b, 0) / changePointIndex,
        postChangeScore: scores.slice(changePointIndex).reduce((a, b) => a + b, 0) / (scores.length - changePointIndex),
        changePointTimestamp: timestamps[changePointIndex]
      };
    }

    return { hasChangePoint: false };
  }

  /**
   * Evaluate if drift conditions are met
   */
  private evaluateDriftConditions(
    trendAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.analyzeTrend>,
    variabilityAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.analyzeVariability>,
    changePointAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.detectChangePoints>
  ): boolean {
    
    // Trend-based drift
    const significantTrend = Math.abs(trendAnalysis.direction) > 0.3 && 
                            trendAnalysis.consistency > 0.5 &&
                            trendAnalysis.magnitude > this.config.driftThresholds.mild;
    
    // Variability-based drift  
    const highVariability = variabilityAnalysis.volatility > 0.2 || 
                           variabilityAnalysis.stability < 0.6;
    
    // Change point drift
    const suddenChange = changePointAnalysis.hasChangePoint;
    
    return significantTrend || highVariability || suddenChange;
  }

  /**
   * Classify the type of drift detected
   */
  private classifyDriftType(
    trendAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.analyzeTrend>,
    variabilityAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.analyzeVariability>,
    changePointAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.detectChangePoints>
  ): DriftType {
    
    // Sudden change detection
    if (changePointAnalysis.hasChangePoint) {
      const changeSize = Math.abs((changePointAnalysis.postChangeScore || 0) - (changePointAnalysis.preChangeScore || 0));
      if (changeSize > 0.3) {
        return 'sudden_change';
      }
    }

    // Trend-based classification
    if (Math.abs(trendAnalysis.direction) > 0.3 && trendAnalysis.consistency > 0.6) {
      if (trendAnalysis.direction < -0.3) {
        return 'gradual_decline';
      } else if (trendAnalysis.direction > 0.3) {
        return 'recovery';
      }
    }

    // High variability
    if (variabilityAnalysis.volatility > 0.25) {
      return 'erratic_behavior';
    }

    // Default
    return 'gradual_decline';
  }

  /**
   * Assess severity of drift
   */
  private assessDriftSeverity(magnitude: number, volatility: number): DriftDetection['driftSeverity'] {
    const overallChange = Math.max(magnitude, volatility);
    
    if (overallChange >= this.config.driftThresholds.severe) return 'severe';
    if (overallChange >= this.config.driftThresholds.significant) return 'significant';
    if (overallChange >= this.config.driftThresholds.moderate) return 'moderate';
    if (overallChange >= this.config.driftThresholds.mild) return 'mild';
    return 'minimal';
  }

  /**
   * Identify modalities most affected by drift
   */
  private identifyAffectedModalities(recentScores: SimilarityScore[]): string[] {
    const modalityScores: Record<string, number[]> = {
      keyboard: [],
      mouse: [],
      scroll: [],
      focus: [],
      composite: []
    };

    // Collect scores by modality
    recentScores.forEach(score => {
      Object.entries(score.modalities).forEach(([modality, modalityScore]) => {
        modalityScores[modality].push(modalityScore.score);
      });
    });

    // Calculate variance for each modality
    const modalityVariances: Array<{ modality: string; variance: number }> = [];
    
    Object.entries(modalityScores).forEach(([modality, scores]) => {
      if (scores.length > 0) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        modalityVariances.push({ modality, variance });
      }
    });

    // Return modalities with high variance (top 3)
    return modalityVariances
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 3)
      .filter(m => m.variance > 0.1) // Threshold for significant variance
      .map(m => m.modality);
  }

  /**
   * Identify features showing strongest drift
   */
  private identifyPrimaryDriftFeatures(recentScores: SimilarityScore[]): string[] {
    const featureAnomalies: Record<string, number> = {};

    // Count anomalies by feature across all scores
    recentScores.forEach(score => {
      Object.values(score.modalities).forEach(modality => {
        modality.anomalies.forEach(anomaly => {
          featureAnomalies[anomaly.feature] = (featureAnomalies[anomaly.feature] || 0) + 1;
        });
      });
    });

    // Return features with most frequent anomalies
    return Object.entries(featureAnomalies)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) // Top 5
      .map(([feature]) => feature);
  }

  /**
   * Determine drift direction
   */
  private determineDriftDirection(trendDirection: number): DriftDetection['driftDirection'] {
    if (trendDirection < -0.2) return 'deterioration';
    if (trendDirection > 0.2) return 'improvement';
    return 'change';
  }

  /**
   * Calculate rate of drift per day
   */
  private calculateDriftRate(scores: number[], timestamps: number[]): number {
    if (scores.length < 2) return 0;

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const firstTime = timestamps[0];
    const lastTime = timestamps[timestamps.length - 1];
    
    const timeDiff = lastTime - firstTime;
    const scoreDiff = lastScore - firstScore;
    
    if (timeDiff === 0) return 0;
    
    // Convert to change per day
    const msPerDay = 24 * 60 * 60 * 1000;
    return (scoreDiff / timeDiff) * msPerDay;
  }

  /**
   * Assess medical significance of drift
   */
  private assessMedicalSignificance(
    driftType: DriftType,
    severity: DriftDetection['driftSeverity'],
    affectedModalities: string[],
    primaryFeatures: string[]
  ): {
    significance: DriftDetection['medicalSignificance'];
    likelyProgression: boolean;
    actions: string[];
  } {
    
    let significance: DriftDetection['medicalSignificance'] = 'none';
    let likelyProgression = false;
    const actions: string[] = [];

    // Assess based on severity
    if (severity === 'severe' || severity === 'significant') {
      significance = 'clinical_attention';
      actions.push('Clinical evaluation recommended');
    } else if (severity === 'moderate') {
      significance = 'monitoring';
      actions.push('Enhanced monitoring recommended');
    }

    // Assess based on drift type
    if (driftType === 'gradual_decline' || driftType === 'sudden_change') {
      likelyProgression = true;
      // Escalate to at least 'monitoring' if lower
      if (significance === 'none') {
        significance = 'monitoring';
      }
      actions.push('Monitor for disease progression');
    }

    // Check for neurological indicators
    const neurologicalFeatures = primaryFeatures.filter(f => 
      ['tremorInKeystrokes', 'tremorAmplitude', 'motorSlowness', 'globalNeuromotorIndex'].includes(f)
    );

    if (neurologicalFeatures.length >= 2) {
      significance = 'clinical_attention';
      likelyProgression = true;
      actions.push('Neurological evaluation recommended');
    }

    // Multi-modal involvement
    if (affectedModalities.length >= 3) {
      if (significance === 'none') {
        significance = 'monitoring';
      }
      actions.push('Multi-modal changes detected');
    }

    return { significance, likelyProgression, actions };
  }

  /**
   * Calculate confidence in drift detection
   */
  private calculateDriftConfidence(
    trendAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.analyzeTrend>,
    variabilityAnalysis: ReturnType<typeof AdaptiveRecognition.prototype.analyzeVariability>,
    recentScores: SimilarityScore[]
  ): number {
    
    // Components of confidence
    const trendConfidence = trendAnalysis.consistency;
    const dataQuality = recentScores.reduce((sum, s) => sum + s.confidence, 0) / recentScores.length;
    const sampleSize = Math.min(1, recentScores.length / 10);
    const stabilityPenalty = Math.max(0, 1 - variabilityAnalysis.volatility);
    
    const confidence = (trendConfidence * 0.3) + 
                      (dataQuality * 0.3) + 
                      (sampleSize * 0.2) + 
                      (stabilityPenalty * 0.2);

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Handle detected drift - trigger adaptations
   */
  private async handleDriftDetection(state: RecognitionState, drift: DriftDetection): Promise<void> {
    logger.info('Drift detected', {
      userId: state.userId,
      driftType: drift.driftType,
      severity: drift.driftSeverity,
      confidence: drift.confidence,
      medicalSignificance: drift.medicalSignificance
    });

    // Check adaptation triggers
    const shouldAdapt = this.evaluateAdaptationTriggers(state, drift);

    if (shouldAdapt) {
      await this.triggerAdaptation(state, drift);
    }

    // Update monitoring mode based on drift
    if (drift.medicalSignificance === 'clinical_attention' || drift.medicalSignificance === 'immediate_review') {
      state.monitoringMode = 'clinical';
    } else if (drift.medicalSignificance === 'monitoring') {
      state.monitoringMode = 'enhanced';
    }
  }

  /**
   * Evaluate if adaptation should be triggered
   */
  private evaluateAdaptationTriggers(state: RecognitionState, drift: DriftDetection): boolean {
    const recentDrifts = state.driftHistory.slice(-5); // Last 5 drift detections
    
    // Severe drift trigger
    if (drift.driftSeverity === 'severe' || drift.driftSeverity === 'significant') {
      return true;
    }

    // Consistent drift trigger
    const consistentDrifts = recentDrifts.filter(d => 
      d.driftType === drift.driftType && d.driftDirection === drift.driftDirection
    );
    
    if (consistentDrifts.length >= this.config.adaptationTriggers.consistentDrift) {
      return true;
    }

    // Medical significance trigger
    if (drift.medicalSignificance === 'clinical_attention' || drift.medicalSignificance === 'immediate_review') {
      return true;
    }

    return false;
  }

  /**
   * Trigger adaptation process
   */
  private async triggerAdaptation(state: RecognitionState, drift: DriftDetection): Promise<void> {
    logger.info('Triggering adaptation', {
      userId: state.userId,
      driftType: drift.driftType,
      severity: drift.driftSeverity
    });

    // Mark adaptation as scheduled
    state.adaptationScheduled = true;

    // The actual adaptation logic would be implemented here
    // This might include:
    // - Updating baseline with recent data
    // - Adjusting similarity thresholds
    // - Reweighting features
    // - Notifying medical professionals

    // For now, we'll just log the action
    logger.info('Adaptation process initiated', { userId: state.userId });
  }

  /**
   * Helper methods
   */
  private initializeRecognitionState(userId: string, baseline: BaselinePattern): RecognitionState {
    return {
      userId,
      currentBaseline: baseline,
      recentScores: [],
      driftHistory: [],
      evolutionHistory: [],
      lastDriftCheck: Date.now(),
      adaptationScheduled: false,
      monitoringMode: 'normal',
      statistics: {
        totalSessions: 0,
        driftDetectionCount: 0,
        adaptationCount: 0,
        avgSimilarityScore: 0.5,
        stabilityTrend: 0
      }
    };
  }

  private updateStateStatistics(state: RecognitionState): void {
    const recentScores = state.recentScores.slice(-10);
    state.statistics.totalSessions = state.recentScores.length;
    state.statistics.avgSimilarityScore = recentScores.reduce((sum, s) => sum + s.overall, 0) / recentScores.length;
    state.statistics.driftDetectionCount = state.driftHistory.length;
    
    // Calculate stability trend
    if (recentScores.length >= 5) {
      const recent = recentScores.slice(-5).map(s => s.overall);
      const older = recentScores.slice(-10, -5).map(s => s.overall);
      
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        state.statistics.stabilityTrend = recentAvg - olderAvg;
      }
    }
  }

  private updateMonitoringMode(state: RecognitionState): void {
    const recentDrifts = state.driftHistory.slice(-3);
    const hasRecentSevereDrift = recentDrifts.some(d => 
      d.driftSeverity === 'severe' || d.driftSeverity === 'significant'
    );
    
    const hasRecentMedicalConcern = recentDrifts.some(d => 
      d.medicalSignificance === 'clinical_attention' || d.medicalSignificance === 'immediate_review'
    );

    if (hasRecentMedicalConcern) {
      state.monitoringMode = 'clinical';
    } else if (hasRecentSevereDrift || recentDrifts.length >= 2) {
      state.monitoringMode = 'enhanced';
    } else {
      state.monitoringMode = 'normal';
    }
  }

  private analyzePatternEvolution(state: RecognitionState, score: SimilarityScore): PatternEvolution {
    // Simplified pattern evolution analysis
    const dominantPatterns = {
      neuromotor: score.modalities.keyboard.score * 0.5 + score.modalities.mouse.score * 0.5,
      cognitive: score.modalities.focus.score,
      temporal: score.modalities.composite.score,
      behavioral: score.overall
    };

    let evolutionType: PatternEvolution['evolutionType'] = 'stable_period';
    
    if (state.recentScores.length < 5) {
      evolutionType = 'baseline_establishment';
    } else if (state.driftHistory.length > 0 && state.driftHistory[state.driftHistory.length - 1].isDrifting) {
      evolutionType = 'drift_detected';
    }

    return {
      userId: state.userId,
      timepoint: score.timestamp,
      evolutionType,
      dominantPatterns,
      changeVector: {
        magnitude: 1 - score.overall, // Deviation from baseline
        direction: score.interpretation.overallAssessment,
        acceleration: 0 // Would need more history to calculate
      },
      assessmentConfidence: score.confidence,
      contextFactors: []
    };
  }

  private cleanupHistory(state: RecognitionState): void {
    const maxDriftHistory = 50;
    const maxEvolutionHistory = 100;
    
    if (state.driftHistory.length > maxDriftHistory) {
      state.driftHistory = state.driftHistory.slice(-maxDriftHistory);
    }
    
    if (state.evolutionHistory.length > maxEvolutionHistory) {
      state.evolutionHistory = state.evolutionHistory.slice(-maxEvolutionHistory);
    }
  }

  /**
   * Get current recognition state for a user
   */
  getRecognitionState(userId: string): RecognitionState | null {
    return this.recognitionStates.get(userId) || null;
  }

  /**
   * Get drift history for a user
   */
  getDriftHistory(userId: string): DriftDetection[] {
    const state = this.recognitionStates.get(userId);
    return state?.driftHistory || [];
  }

  /**
   * Get statistics
   */
  getStats() {
    const states = Array.from(this.recognitionStates.values());
    
    return {
      totalUsers: states.length,
      usersWithDrift: states.filter(s => s.driftHistory.length > 0).length,
      totalDriftDetections: states.reduce((sum, s) => sum + s.statistics.driftDetectionCount, 0),
      averageStabilityTrend: states.reduce((sum, s) => sum + s.statistics.stabilityTrend, 0) / Math.max(1, states.length),
      monitoringModes: {
        normal: states.filter(s => s.monitoringMode === 'normal').length,
        enhanced: states.filter(s => s.monitoringMode === 'enhanced').length,
        clinical: states.filter(s => s.monitoringMode === 'clinical').length
      }
    };
  }
}

export const adaptiveRecognition = AdaptiveRecognition.getInstance();
/* eslint-disable no-trailing-spaces */
import { createComponentLogger } from '../utils/Logger';
import { KeyboardTimingFeatures } from '../features/KeyboardFeatures';
import { MouseMovementFeatures } from '../features/MouseFeatures';
import { ScrollBehaviorFeatures } from '../features/ScrollFeatures';
import { FocusAttentionFeatures } from '../features/FocusFeatures';
import { CompositeTimingFeatures } from '../features/CompositeFeatures';

const logger = createComponentLogger('BaselineModeling');

export interface BaselinePattern {
  id: string;
  userId: string;
  timestamp: number;
  version: string;
  
  // Core feature baselines
  keyboard: Partial<KeyboardTimingFeatures>;
  mouse: Partial<MouseMovementFeatures>;
  scroll: Partial<ScrollBehaviorFeatures>;
  focus: Partial<FocusAttentionFeatures>;
  composite: Partial<CompositeTimingFeatures>;
  
  // Statistical characteristics
  statistics: {
    sampleCount: number;
    sessionCount: number;
    totalDuration: number; // ms
    confidence: number; // 0-1
    stability: number; // 0-1, how stable the baseline is
    coverage: FeatureCoverage; // Which features are well-represented
  };
  
  // Variability bounds (for anomaly detection)
  variability: {
    keyboard: Record<string, { mean: number; std: number; bounds: [number, number] }>;
    mouse: Record<string, { mean: number; std: number; bounds: [number, number] }>;
    scroll: Record<string, { mean: number; std: number; bounds: [number, number] }>;
    focus: Record<string, { mean: number; std: number; bounds: [number, number] }>;
    composite: Record<string, { mean: number; std: number; bounds: [number, number] }>;
  };
  
  // Temporal patterns
  temporalCharacteristics: {
    circadianPattern?: number[]; // 24-hour activity pattern
    weeklyPattern?: number[]; // 7-day pattern
    sessionLengthDistribution: { mean: number; std: number };
    optimalPerformanceWindow?: { start: number; end: number }; // Hours of day
  };
  
  // Environmental context
  environmentalContext: {
    deviceCharacteristics: Record<string, any>;
    typicalConditions: string[];
    performanceModifiers: Record<string, number>; // Environmental factors that affect performance
  };
  
  // Metadata
  metadata: {
    creationMethod: 'initial' | 'adaptive' | 'merged';
    dataQuality: 'low' | 'medium' | 'high' | 'excellent';
    medicalRelevance: 'screening' | 'monitoring' | 'diagnostic';
    lastUpdated: number;
  };
}

export interface FeatureCoverage {
  keyboard: { [K in keyof KeyboardTimingFeatures]?: boolean };
  mouse: { [K in keyof MouseMovementFeatures]?: boolean };
  scroll: { [K in keyof ScrollBehaviorFeatures]?: boolean };
  focus: { [K in keyof FocusAttentionFeatures]?: boolean };
  composite: { [K in keyof CompositeTimingFeatures]?: boolean };
}

export interface BaselineUpdateResult {
  success: boolean;
  confidenceChange: number;
  stabilityChange: number;
  significantChanges: string[];
  warnings: string[];
}

export interface FeatureSnapshot {
  timestamp: number;
  sessionId: string;
  keyboard?: Partial<KeyboardTimingFeatures>;
  mouse?: Partial<MouseMovementFeatures>;
  scroll?: Partial<ScrollBehaviorFeatures>;
  focus?: Partial<FocusAttentionFeatures>;
  composite?: Partial<CompositeTimingFeatures>;
  environmentalContext: Record<string, any>;
  quality: number; // 0-1
}

export class BaselineModeling {
  private static instance: BaselineModeling;
  private baselines = new Map<string, BaselinePattern>();
  private recentSnapshots = new Map<string, FeatureSnapshot[]>();
  private readonly maxSnapshotsPerUser = 1000;
  private readonly minSnapshotsForBaseline = 20;
  private readonly stabilityThreshold = 0.8;

  private constructor() {}

  static getInstance(): BaselineModeling {
    if (!BaselineModeling.instance) {
      BaselineModeling.instance = new BaselineModeling();
    }
    return BaselineModeling.instance;
  }

  /**
   * Add a new feature snapshot for baseline computation
   */
  addSnapshot(userId: string, snapshot: FeatureSnapshot): void {
    if (!this.recentSnapshots.has(userId)) {
      this.recentSnapshots.set(userId, []);
    }

    const userSnapshots = this.recentSnapshots.get(userId)!;
    userSnapshots.push(snapshot);

    // Maintain rolling window
    if (userSnapshots.length > this.maxSnapshotsPerUser) {
      userSnapshots.splice(0, userSnapshots.length - this.maxSnapshotsPerUser);
    }

    logger.debug('Added feature snapshot', {
      userId,
      sessionId: snapshot.sessionId,
      quality: snapshot.quality,
      totalSnapshots: userSnapshots.length
    });

    // Check if we should update/create baseline
    if (userSnapshots.length >= this.minSnapshotsForBaseline) {
      this.evaluateBaselineUpdate(userId);
    }
  }

  /**
   * Get current baseline for a user
   */
  getBaseline(userId: string): BaselinePattern | null {
    return this.baselines.get(userId) || null;
  }

  /**
   * Create initial baseline from accumulated snapshots
   */
  async createInitialBaseline(userId: string): Promise<BaselinePattern | null> {
    const snapshots = this.recentSnapshots.get(userId);
    if (!snapshots || snapshots.length < this.minSnapshotsForBaseline) {
      logger.warn('Insufficient data for baseline creation', {
        userId,
        snapshotCount: snapshots?.length || 0,
        required: this.minSnapshotsForBaseline
      });
      return null;
    }

    // Filter high-quality snapshots
    const qualitySnapshots = snapshots.filter(s => s.quality >= 0.7);
    if (qualitySnapshots.length < this.minSnapshotsForBaseline * 0.7) {
      logger.warn('Insufficient quality data for baseline', {
        userId,
        qualitySnapshots: qualitySnapshots.length,
        totalSnapshots: snapshots.length
      });
      return null;
    }

    const baseline = await this.computeBaselineFromSnapshots(userId, qualitySnapshots, 'initial');
    
    if (baseline) {
      this.baselines.set(userId, baseline);
      logger.info('Initial baseline created', {
        userId,
        confidence: baseline.statistics.confidence,
        stability: baseline.statistics.stability,
        sampleCount: baseline.statistics.sampleCount
      });
    }

    return baseline;
  }

  /**
   * Update existing baseline with new data
   */
  async updateBaseline(userId: string): Promise<BaselineUpdateResult> {
    const currentBaseline = this.baselines.get(userId);
    if (!currentBaseline) {
      const newBaseline = await this.createInitialBaseline(userId);
      return {
        success: !!newBaseline,
        confidenceChange: newBaseline?.statistics.confidence || 0,
        stabilityChange: newBaseline?.statistics.stability || 0,
        significantChanges: newBaseline ? ['baseline_created'] : [],
        warnings: newBaseline ? [] : ['insufficient_data']
      };
    }

    const snapshots = this.recentSnapshots.get(userId);
    if (!snapshots) {
      return {
        success: false,
        confidenceChange: 0,
        stabilityChange: 0,
        significantChanges: [],
        warnings: ['no_snapshot_data']
      };
    }

    // Get recent high-quality snapshots for update
    const recentSnapshots = snapshots
      .filter(s => s.timestamp > currentBaseline.timestamp)
      .filter(s => s.quality >= 0.6);

    if (recentSnapshots.length < 5) {
      return {
        success: false,
        confidenceChange: 0,
        stabilityChange: 0,
        significantChanges: [],
        warnings: ['insufficient_recent_data']
      };
    }

    const updatedBaseline = await this.adaptiveBaselineUpdate(currentBaseline, recentSnapshots);
    
    if (updatedBaseline) {
      const confidenceChange = updatedBaseline.statistics.confidence - currentBaseline.statistics.confidence;
      const stabilityChange = updatedBaseline.statistics.stability - currentBaseline.statistics.stability;
      
      // Detect significant changes
      const significantChanges = this.detectSignificantChanges(currentBaseline, updatedBaseline);
      
      this.baselines.set(userId, updatedBaseline);
      
      logger.info('Baseline updated', {
        userId,
        confidenceChange,
        stabilityChange,
        significantChanges: significantChanges.length
      });

      return {
        success: true,
        confidenceChange,
        stabilityChange,
        significantChanges,
        warnings: []
      };
    }

    return {
      success: false,
      confidenceChange: 0,
      stabilityChange: 0,
      significantChanges: [],
      warnings: ['update_failed']
    };
  }

  /**
   * Compute baseline from snapshots
   */
  private async computeBaselineFromSnapshots(
    userId: string, 
    snapshots: FeatureSnapshot[], 
    method: 'initial' | 'adaptive' | 'merged'
  ): Promise<BaselinePattern | null> {
    
    if (snapshots.length < this.minSnapshotsForBaseline) {
      return null;
    }

    // Aggregate features by modality
    const aggregatedFeatures = this.aggregateFeatures(snapshots);
    const variability = this.computeVariability(snapshots);
    const temporalCharacteristics = this.computeTemporalCharacteristics(snapshots);
    const environmentalContext = this.aggregateEnvironmentalContext(snapshots);
    const coverage = this.computeFeatureCoverage(snapshots);

    // Compute quality metrics
    const totalDuration = snapshots.reduce((sum, s) => {
      const duration = s.keyboard?.sessionDuration || s.focus?.sessionDuration || 0;
      return sum + duration;
    }, 0);

    const confidence = this.computeBaselineConfidence(snapshots, coverage);
    const stability = this.computeBaselineStability(snapshots);

    const baseline: BaselinePattern = {
      id: `baseline_${userId}_${Date.now()}`,
      userId,
      timestamp: Date.now(),
      version: '1.0.0',
      
      keyboard: aggregatedFeatures.keyboard,
      mouse: aggregatedFeatures.mouse,
      scroll: aggregatedFeatures.scroll,
      focus: aggregatedFeatures.focus,
      composite: aggregatedFeatures.composite,
      
      statistics: {
        sampleCount: snapshots.length,
        sessionCount: new Set(snapshots.map(s => s.sessionId)).size,
        totalDuration,
        confidence,
        stability,
        coverage
      },
      
      variability,
      temporalCharacteristics,
      environmentalContext,
      
      metadata: {
        creationMethod: method,
        dataQuality: this.assessDataQuality(confidence, stability, snapshots.length),
        medicalRelevance: this.assessMedicalRelevance(confidence, stability),
        lastUpdated: Date.now()
      }
    };

    return baseline;
  }

  /**
   * Aggregate features across snapshots using robust statistics
   */
  private aggregateFeatures(snapshots: FeatureSnapshot[]): {
    keyboard: Partial<KeyboardTimingFeatures>;
    mouse: Partial<MouseMovementFeatures>;
    scroll: Partial<ScrollBehaviorFeatures>;
    focus: Partial<FocusAttentionFeatures>;
    composite: Partial<CompositeTimingFeatures>;
  } {
    
    const result: any = {
      keyboard: {},
      mouse: {},
      scroll: {},
      focus: {},
      composite: {}
    };

    const modalities = ['keyboard', 'mouse', 'scroll', 'focus', 'composite'] as const;

    for (const modality of modalities) {
      const modalitySnapshots = snapshots
        .map(s => s[modality])
        .filter(m => m && Object.keys(m).length > 0);

      if (modalitySnapshots.length === 0) continue;

      // Get all feature keys across snapshots
      const allKeys = new Set<string>();
      modalitySnapshots.forEach(m => Object.keys(m!).forEach(k => allKeys.add(k)));

      // Compute robust statistics for each feature
      for (const key of allKeys) {
        const values = modalitySnapshots
          .map(m => (m as any)?.[key])
          .filter(v => typeof v === 'number' && !isNaN(v));

        if (values.length >= 3) { // Minimum for robust statistics
          result[modality][key] = this.computeRobustMean(values);
        }
      }
    }

    return result;
  }

  /**
   * Compute robust mean using trimmed mean (removes outliers)
   */
  private computeRobustMean(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length < 4) return values.reduce((a, b) => a + b, 0) / values.length;

    // Sort and remove top/bottom 10%
    const sorted = [...values].sort((a, b) => a - b);
    const trimAmount = Math.floor(values.length * 0.1);
    const trimmed = sorted.slice(trimAmount, sorted.length - trimAmount);
    
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  }

  /**
   * Compute variability statistics for anomaly detection
   */
  private computeVariability(snapshots: FeatureSnapshot[]): BaselinePattern['variability'] {
    const result: any = {
      keyboard: {},
      mouse: {},
      scroll: {},
      focus: {},
      composite: {}
    };

    const modalities = ['keyboard', 'mouse', 'scroll', 'focus', 'composite'] as const;

    for (const modality of modalities) {
      const modalitySnapshots = snapshots
        .map(s => s[modality])
        .filter(m => m && Object.keys(m).length > 0);

      if (modalitySnapshots.length === 0) continue;

      const allKeys = new Set<string>();
      modalitySnapshots.forEach(m => Object.keys(m!).forEach(k => allKeys.add(k)));

      for (const key of allKeys) {
        const values = modalitySnapshots
          .map(m => (m as any)?.[key])
          .filter(v => typeof v === 'number' && !isNaN(v));

        if (values.length >= 3) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
          const std = Math.sqrt(variance);
          
          // Compute bounds using 2.5 standard deviations (covers ~95% of normal distribution)
          const bounds: [number, number] = [
            Math.max(0, mean - 2.5 * std),
            mean + 2.5 * std
          ];

          result[modality][key] = { mean, std, bounds };
        }
      }
    }

    return result;
  }

  /**
   * Compute temporal characteristics
   */
  private computeTemporalCharacteristics(snapshots: FeatureSnapshot[]): BaselinePattern['temporalCharacteristics'] {
    const sessionDurations: number[] = [];
    const hourlyActivity: number[] = new Array(24).fill(0);
    const dailyActivity: number[] = new Array(7).fill(0);

    for (const snapshot of snapshots) {
      const duration = snapshot.keyboard?.sessionDuration || snapshot.focus?.sessionDuration || 0;
      if (duration > 0) {
        sessionDurations.push(duration);
      }

      // Extract temporal patterns
      const date = new Date(snapshot.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      
      hourlyActivity[hour]++;
      dailyActivity[day]++;
    }

    const sessionLengthMean = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;
    
    const sessionLengthVariance = sessionDurations.length > 1 
      ? sessionDurations.reduce((sum, d) => sum + Math.pow(d - sessionLengthMean, 2), 0) / sessionDurations.length
      : 0;

    // Find optimal performance window (hours with highest activity)
    const maxActivity = Math.max(...hourlyActivity);
    let optimalStart = 0;
    let optimalEnd = 23;
    
    if (maxActivity > 0) {
      const threshold = maxActivity * 0.7;
      const activeHours = hourlyActivity.map((activity, hour) => ({ hour, activity }))
        .filter(h => h.activity >= threshold)
        .map(h => h.hour);
      
      if (activeHours.length > 0) {
        optimalStart = Math.min(...activeHours);
        optimalEnd = Math.max(...activeHours);
      }
    }

    return {
      circadianPattern: hourlyActivity.length > 0 ? hourlyActivity : undefined,
      weeklyPattern: dailyActivity.length > 0 ? dailyActivity : undefined,
      sessionLengthDistribution: {
        mean: sessionLengthMean,
        std: Math.sqrt(sessionLengthVariance)
      },
      optimalPerformanceWindow: { start: optimalStart, end: optimalEnd }
    };
  }

  /**
   * Aggregate environmental context
   */
  private aggregateEnvironmentalContext(snapshots: FeatureSnapshot[]): BaselinePattern['environmentalContext'] {
    const deviceCharacteristics: Record<string, any> = {};
    const conditionsSet = new Set<string>();
    const performanceModifiers: Record<string, number[]> = {};

    for (const snapshot of snapshots) {
      // Aggregate device characteristics
      Object.assign(deviceCharacteristics, snapshot.environmentalContext);

      // Track typical conditions
      const condition = this.classifySessionCondition(snapshot);
      if (condition) {
        conditionsSet.add(condition);
      }
    }

    return {
      deviceCharacteristics,
      typicalConditions: Array.from(conditionsSet),
      performanceModifiers: Object.fromEntries(
        Object.entries(performanceModifiers).map(([key, values]) => [
          key, 
          values.reduce((a, b) => a + b, 0) / values.length
        ])
      )
    };
  }

  /**
   * Compute feature coverage
   */
  private computeFeatureCoverage(snapshots: FeatureSnapshot[]): FeatureCoverage {
    const coverage: any = {
      keyboard: {},
      mouse: {},
      scroll: {},
      focus: {},
      composite: {}
    };

    const modalities = ['keyboard', 'mouse', 'scroll', 'focus', 'composite'] as const;
    const threshold = Math.max(3, snapshots.length * 0.3); // At least 30% coverage

    for (const modality of modalities) {
      const modalitySnapshots = snapshots
        .map(s => s[modality])
        .filter(m => m && Object.keys(m).length > 0);

      if (modalitySnapshots.length === 0) continue;

      const allKeys = new Set<string>();
      modalitySnapshots.forEach(m => Object.keys(m!).forEach(k => allKeys.add(k)));

      for (const key of allKeys) {
        const validCount = modalitySnapshots
          .map(m => (m as any)?.[key])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .length;

        coverage[modality][key] = validCount >= threshold;
      }
    }

    return coverage;
  }

  /**
   * Compute baseline confidence
   */
  private computeBaselineConfidence(snapshots: FeatureSnapshot[], coverage: FeatureCoverage): number {
    const sampleSize = snapshots.length;
    const qualityScore = snapshots.reduce((sum, s) => sum + s.quality, 0) / snapshots.length;
    
    // Coverage score
    const modalities = ['keyboard', 'mouse', 'scroll', 'focus', 'composite'] as const;
    let totalFeatures = 0;
    let coveredFeatures = 0;

    for (const modality of modalities) {
      const modalityCoverage = coverage[modality];
      const features = Object.keys(modalityCoverage);
      totalFeatures += features.length;
      coveredFeatures += features.filter(k => modalityCoverage[k as keyof typeof modalityCoverage]).length;
    }

    const coverageScore = totalFeatures > 0 ? coveredFeatures / totalFeatures : 0;
    
    // Sample size score (sigmoid)
    const sampleScore = 1 / (1 + Math.exp(-(sampleSize - 50) / 20));
    
    // Combined confidence
    const confidence = (qualityScore * 0.4) + (coverageScore * 0.35) + (sampleScore * 0.25);
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Compute baseline stability
   */
  private computeBaselineStability(snapshots: FeatureSnapshot[]): number {
    if (snapshots.length < 10) return 0.5;

    // Split into first and second half
    const mid = Math.floor(snapshots.length / 2);
    const firstHalf = snapshots.slice(0, mid);
    const secondHalf = snapshots.slice(mid);

    // Compute feature means for each half
    const firstMeans = this.aggregateFeatures(firstHalf);
    const secondMeans = this.aggregateFeatures(secondHalf);

    // Compare stability across key features
    const stabilityScores: number[] = [];
    
    const keyFeatures = [
      ['keyboard', 'meanDwell'],
      ['keyboard', 'typingRhythm'],
      ['mouse', 'meanVelocity'],
      ['focus', 'focusRatio'],
      ['composite', 'globalTimingEntropy']
    ];

    for (const [modality, feature] of keyFeatures) {
      const first = (firstMeans as any)[modality][feature];
      const second = (secondMeans as any)[modality][feature];
      
      if (typeof first === 'number' && typeof second === 'number' && first > 0) {
        const relativeDiff = Math.abs(second - first) / first;
        const stability = Math.max(0, 1 - relativeDiff * 2); // Penalize >50% changes heavily
        stabilityScores.push(stability);
      }
    }

    return stabilityScores.length > 0 
      ? stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length 
      : 0.5;
  }

  /**
   * Evaluate whether baseline should be updated
   */
  private evaluateBaselineUpdate(userId: string): void {
    const snapshots = this.recentSnapshots.get(userId);
    if (!snapshots) return;

    const baseline = this.baselines.get(userId);
    const recentSnapshots = snapshots.slice(-20); // Last 20 snapshots
    
    if (!baseline) {
      // Create initial baseline if we have enough data
      if (snapshots.length >= this.minSnapshotsForBaseline) {
        this.createInitialBaseline(userId);
      }
      return;
    }

    // Check if significant time has passed or if we have new quality data
    const timeSinceUpdate = Date.now() - baseline.metadata.lastUpdated;
    const significantTime = timeSinceUpdate > 7 * 24 * 60 * 60 * 1000; // 1 week
    
    const newQualitySnapshots = recentSnapshots.filter(s => 
      s.timestamp > baseline.timestamp && s.quality >= 0.7
    );

    if (significantTime || newQualitySnapshots.length >= 10) {
      logger.debug('Triggering baseline update evaluation', {
        userId,
        timeSinceUpdate: timeSinceUpdate / (1000 * 60 * 60 * 24), // days
        newQualitySnapshots: newQualitySnapshots.length
      });

      // Async update (don't await to avoid blocking)
      this.updateBaseline(userId).catch(error => {
        logger.error('Failed to update baseline', { userId, error });
      });
    }
  }

  /**
   * Adaptive baseline update
   */
  private async adaptiveBaselineUpdate(
    currentBaseline: BaselinePattern, 
    newSnapshots: FeatureSnapshot[]
  ): Promise<BaselinePattern | null> {
    
    // Combine existing baseline data with new snapshots
    // This is a simplified approach - in production, you'd want more sophisticated merging
    const existingSnapshots = this.recentSnapshots.get(currentBaseline.userId) || [];
    const allSnapshots = [...existingSnapshots, ...newSnapshots];
    
    // Apply exponential decay to older samples
    const decayFactor = 0.95;
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    const weightedSnapshots = allSnapshots
      .filter(s => (now - s.timestamp) < maxAge)
      .map(s => {
        const age = now - s.timestamp;
        const weight = Math.pow(decayFactor, age / (24 * 60 * 60 * 1000)); // Daily decay
        return { ...s, quality: s.quality * weight };
      })
      .filter(s => s.quality > 0.1);

    if (weightedSnapshots.length < this.minSnapshotsForBaseline) {
      return null;
    }

    return this.computeBaselineFromSnapshots(
      currentBaseline.userId, 
      weightedSnapshots, 
      'adaptive'
    );
  }

  /**
   * Detect significant changes between baselines
   */
  private detectSignificantChanges(oldBaseline: BaselinePattern, newBaseline: BaselinePattern): string[] {
    const changes: string[] = [];
    
    // Define significant change thresholds
    const thresholds = {
      keyboard: {
        meanDwell: 0.2, // 20% change
        typingRhythm: 0.15,
        motorSlowness: 0.1
      },
      composite: {
        globalTimingEntropy: 0.25,
        globalNeuromotorIndex: 0.15
      }
    };

    const checkFeature = (modality: string, feature: string, threshold: number) => {
      const oldValue = (oldBaseline as any)[modality][feature];
      const newValue = (newBaseline as any)[modality][feature];
      
      if (typeof oldValue === 'number' && typeof newValue === 'number' && oldValue > 0) {
        const relativeDiff = Math.abs(newValue - oldValue) / oldValue;
        if (relativeDiff >= threshold) {
          changes.push(`${modality}_${feature}_change`);
        }
      }
    };

    // Check significant features
    Object.entries(thresholds).forEach(([modality, features]) => {
      Object.entries(features).forEach(([feature, threshold]) => {
        checkFeature(modality, feature, threshold);
      });
    });

    return changes;
  }

  /**
   * Helper methods
   */
  private classifySessionCondition(snapshot: FeatureSnapshot): string | null {
    // Classify session based on quality and environmental factors
    if (snapshot.quality > 0.8) return 'optimal';
    if (snapshot.quality > 0.6) return 'good';
    if (snapshot.quality > 0.4) return 'fair';
    return 'poor';
  }

  private assessDataQuality(confidence: number, stability: number, sampleCount: number): BaselinePattern['metadata']['dataQuality'] {
    const score = (confidence * 0.5) + (stability * 0.3) + (Math.min(1, sampleCount / 100) * 0.2);
    
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private assessMedicalRelevance(confidence: number, stability: number): BaselinePattern['metadata']['medicalRelevance'] {
    if (confidence >= 0.8 && stability >= 0.8) return 'diagnostic';
    if (confidence >= 0.6 && stability >= 0.6) return 'monitoring';
    return 'screening';
  }

  /**
   * Get baseline statistics
   */
  getStats() {
    return {
      totalBaselines: this.baselines.size,
      totalUsers: this.recentSnapshots.size,
      averageSnapshots: Array.from(this.recentSnapshots.values())
        .reduce((sum, snapshots) => sum + snapshots.length, 0) / this.recentSnapshots.size,
      baselinesWithHighConfidence: Array.from(this.baselines.values())
        .filter(b => b.statistics.confidence >= 0.8).length
    };
  }
}

export const baselineModeling = BaselineModeling.getInstance();
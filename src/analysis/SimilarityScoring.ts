/* eslint-disable no-trailing-spaces */
import { BaselinePattern, FeatureSnapshot } from './BaselineModeling';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('SimilarityScoring');

export interface SimilarityScore {
  overall: number; // 0-1, overall similarity to baseline
  confidence: number; // 0-1, confidence in the score
  timestamp: number;
  
  // Per-modality scores
  modalities: {
    keyboard: ModalitySimilarity;
    mouse: ModalitySimilarity;
    scroll: ModalitySimilarity;
    focus: ModalitySimilarity;
    composite: ModalitySimilarity;
  };
  
  // Interpretation and explainability
  interpretation: ScoringInterpretation;
  
  // Quality metrics
  reliability: number; // 0-1, how reliable this score is
  coverage: number; // 0-1, what percentage of features could be compared
}

export interface ModalitySimilarity {
  score: number; // 0-1, similarity score for this modality
  weight: number; // Weight used in overall score
  featureCount: number; // Number of features compared
  anomalies: FeatureAnomaly[]; // Detected anomalies
  contributions: FeatureContribution[]; // How each feature contributed
}

export interface FeatureAnomaly {
  feature: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  baselineValue: number;
  zscore: number; // Standard deviations from baseline
  medicalRelevance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface FeatureContribution {
  feature: string;
  contribution: number; // Positive = increases similarity, negative = decreases
  importance: number; // 0-1, how important this feature is
  reliability: number; // 0-1, how reliable this feature measurement is
}

export interface ScoringInterpretation {
  overallAssessment: string;
  primaryConcerns: string[];
  detailedAnalysis: {
    neuromotorFunction: InterpretationSection;
    cognitiveFunction: InterpretationSection;
    temporalPatterns: InterpretationSection;
    behavioralConsistency: InterpretationSection;
  };
  recommendations: string[];
  medicalFlags: MedicalFlag[];
}

export interface InterpretationSection {
  score: number; // 0-1
  summary: string;
  keyFindings: string[];
  riskFactors: string[];
}

export interface MedicalFlag {
  type: 'tremor' | 'bradykinesia' | 'cognitive_decline' | 'attention_deficit' | 'fatigue' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  description: string;
  recommendedAction: string;
}

export type ScoringMethod = 
  | 'euclidean' 
  | 'cosine' 
  | 'mahalanobis' 
  | 'weighted_composite' 
  | 'robust_statistical';

export interface ScoringConfiguration {
  method: ScoringMethod;
  weights: {
    keyboard: number;
    mouse: number;
    scroll: number;
    focus: number;
    composite: number;
  };
  anomalyThresholds: {
    low: number; // Z-score threshold
    medium: number;
    high: number;
    critical: number;
  };
  interpretabilityLevel: 'basic' | 'detailed' | 'medical';
  medicalFlagThresholds: Record<string, number>;
}

export class SimilarityScoring {
  private static instance: SimilarityScoring;
  private config: ScoringConfiguration;

  private constructor() {
    this.config = this.getDefaultConfiguration();
  }

  static getInstance(): SimilarityScoring {
    if (!SimilarityScoring.instance) {
      SimilarityScoring.instance = new SimilarityScoring();
    }
    return SimilarityScoring.instance;
  }

  /**
   * Compute similarity score between current session and baseline
   */
  async computeSimilarity(
    currentSnapshot: FeatureSnapshot,
    baseline: BaselinePattern
  ): Promise<SimilarityScore> {
    const startTime = performance.now();
    
    try {
      // Compute per-modality similarities
      const modalities = await this.computeModalitySimilarities(currentSnapshot, baseline);
      
      // Compute overall similarity
      const overall = this.computeOverallSimilarity(modalities);
      
      // Compute confidence based on data quality and coverage
      const confidence = this.computeConfidence(currentSnapshot, baseline, modalities);
      
      // Generate interpretation
      const interpretation = await this.generateInterpretation(modalities, baseline);
      
      // Compute quality metrics
      const reliability = this.computeReliability(modalities, baseline);
      const coverage = this.computeCoverage(modalities);
      
      const score: SimilarityScore = {
        overall,
        confidence,
        timestamp: Date.now(),
        modalities,
        interpretation,
        reliability,
        coverage
      };

      const computeTime = performance.now() - startTime;
      logger.debug('Similarity score computed', {
        userId: baseline.userId,
        overall: score.overall,
        confidence: score.confidence,
        computeTime: Math.round(computeTime)
      });

      return score;

    } catch (error) {
      logger.error('Failed to compute similarity score', {
        error: error instanceof Error ? error.message : String(error),
        userId: baseline.userId
      });
      
      // Return default score in case of error
      return this.createErrorScore(currentSnapshot.timestamp);
    }
  }

  /**
   * Compute similarities for each modality
   */
  private async computeModalitySimilarities(
    snapshot: FeatureSnapshot,
    baseline: BaselinePattern
  ): Promise<SimilarityScore['modalities']> {
    
    const modalities = ['keyboard', 'mouse', 'scroll', 'focus', 'composite'] as const;
    const results: any = {};

    for (const modality of modalities) {
      const currentFeatures = snapshot[modality];
      const baselineFeatures = baseline[modality];
      const variability = baseline.variability[modality];

      if (!currentFeatures || !baselineFeatures || Object.keys(baselineFeatures).length === 0) {
        results[modality] = this.createEmptyModalitySimilarity(modality);
        continue;
      }

      results[modality] = await this.computeModalitySimilarity(
        currentFeatures,
        baselineFeatures,
        variability,
        modality
      );
    }

    return results;
  }

  /**
   * Compute similarity for a specific modality
   */
  private async computeModalitySimilarity(
    currentFeatures: Record<string, any>,
    baselineFeatures: Record<string, any>,
    variability: Record<string, { mean: number; std: number; bounds: [number, number] }>,
    modalityName: string
  ): Promise<ModalitySimilarity> {

    const featureScores: number[] = [];
    const anomalies: FeatureAnomaly[] = [];
    const contributions: FeatureContribution[] = [];
    
    // Get common features
    const currentKeys = Object.keys(currentFeatures);
    const baselineKeys = Object.keys(baselineFeatures);
    const commonKeys = currentKeys.filter(key => baselineKeys.includes(key));
    
    for (const feature of commonKeys) {
      const currentValue = currentFeatures[feature];
      const baselineValue = baselineFeatures[feature];
      const variance = variability[feature];

      if (typeof currentValue !== 'number' || typeof baselineValue !== 'number') {
        continue;
      }

      // Compute feature similarity
      const featureSimilarity = this.computeFeatureSimilarity(
        currentValue,
        baselineValue,
        variance
      );

      featureScores.push(featureSimilarity.score);

      // Check for anomalies
      if (featureSimilarity.zscore !== undefined) {
        const anomaly = this.detectAnomaly(
          feature,
          currentValue,
          baselineValue,
          featureSimilarity.zscore,
          modalityName
        );

        if (anomaly) {
          anomalies.push(anomaly);
        }
      }

      // Record contribution
      const importance = this.getFeatureImportance(feature, modalityName);
      contributions.push({
        feature,
        contribution: featureSimilarity.score - 0.5, // Normalized contribution
        importance,
        reliability: featureSimilarity.reliability
      });
    }

    // Compute modality score
    const score = featureScores.length > 0 
      ? this.computeWeightedScore(featureScores, contributions)
      : 0;

    const weight = this.config.weights[modalityName as keyof typeof this.config.weights];

    return {
      score,
      weight,
      featureCount: commonKeys.length,
      anomalies,
      contributions
    };
  }

  /**
   * Compute similarity for individual feature
   */
  private computeFeatureSimilarity(
    currentValue: number,
    baselineValue: number,
    variance?: { mean: number; std: number; bounds: [number, number] }
  ): { score: number; zscore?: number; reliability: number } {

    if (!variance || variance.std === 0) {
      // Simple relative difference when no variance data
      const relativeDiff = baselineValue === 0 
        ? (currentValue === 0 ? 0 : 1)
        : Math.abs(currentValue - baselineValue) / baselineValue;
      
      const score = Math.max(0, 1 - relativeDiff);
      return { score, reliability: 0.6 };
    }

    // Use statistical approach when variance is available
    const zscore = Math.abs(currentValue - variance.mean) / variance.std;
    
    // Convert z-score to similarity (higher z-score = lower similarity)
    // Using inverse exponential to handle outliers gracefully
    const score = Math.exp(-zscore / 2);
    
    // Reliability based on variance quality
    const reliability = Math.min(1, 1 / (1 + variance.std / Math.abs(variance.mean)));

    return { score, zscore, reliability };
  }

  /**
   * Detect feature anomaly
   */
  private detectAnomaly(
    feature: string,
    currentValue: number,
    baselineValue: number,
    zscore: number,
    modalityName: string
  ): FeatureAnomaly | null {

    const thresholds = this.config.anomalyThresholds;
    let severity: FeatureAnomaly['severity'] | null = null;

    if (zscore >= thresholds.critical) severity = 'critical';
    else if (zscore >= thresholds.high) severity = 'high';
    else if (zscore >= thresholds.medium) severity = 'medium';
    else if (zscore >= thresholds.low) severity = 'low';

    if (!severity) return null;

    const medicalRelevance = this.getFeatureMedicalRelevance(feature, modalityName);
    const description = this.generateAnomalyDescription(feature, currentValue, baselineValue, zscore, modalityName);

    return {
      feature,
      severity,
      currentValue,
      baselineValue,
      zscore,
      medicalRelevance,
      description
    };
  }

  /**
   * Compute overall similarity from modality scores
   */
  private computeOverallSimilarity(modalities: SimilarityScore['modalities']): number {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.values(modalities).forEach(modality => {
      if (modality.featureCount > 0) {
        weightedSum += modality.score * modality.weight;
        totalWeight += modality.weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Compute confidence in the similarity score
   */
  private computeConfidence(
    snapshot: FeatureSnapshot,
    baseline: BaselinePattern,
    modalities: SimilarityScore['modalities']
  ): number {
    
    // Data quality components
    const snapshotQuality = snapshot.quality;
    const baselineConfidence = baseline.statistics.confidence;
    
    // Coverage component
    const totalFeatures = Object.values(modalities).reduce((sum, m) => sum + m.featureCount, 0);
    const coverageScore = Math.min(1, totalFeatures / 50); // Assume 50 features is full coverage
    
    // Reliability component
    const reliabilityScores = Object.values(modalities)
      .flatMap(m => m.contributions.map(c => c.reliability))
      .filter(r => r > 0);
    
    const avgReliability = reliabilityScores.length > 0 
      ? reliabilityScores.reduce((a, b) => a + b, 0) / reliabilityScores.length
      : 0.5;

    // Combined confidence
    const confidence = (snapshotQuality * 0.3) + 
                     (baselineConfidence * 0.3) + 
                     (coverageScore * 0.2) + 
                     (avgReliability * 0.2);

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate interpretation of similarity scores
   */
  private async generateInterpretation(
    modalities: SimilarityScore['modalities'],
    baseline: BaselinePattern
  ): Promise<ScoringInterpretation> {

    // Overall assessment
    const overallScore = this.computeOverallSimilarity(modalities);
    const overallAssessment = this.generateOverallAssessment(overallScore);

    // Primary concerns
    const primaryConcerns = this.identifyPrimaryConcerns(modalities);

    // Detailed analysis by domain
    const detailedAnalysis = {
      neuromotorFunction: this.analyzeNeuromotorFunction(modalities),
      cognitiveFunction: this.analyzeCognitiveFunction(modalities),
      temporalPatterns: this.analyzeTemporalPatterns(modalities),
      behavioralConsistency: this.analyzeBehavioralConsistency(modalities)
    };

    // Recommendations
    const recommendations = this.generateRecommendations(modalities, overallScore);

    // Medical flags
    const medicalFlags = this.generateMedicalFlags(modalities);

    return {
      overallAssessment,
      primaryConcerns,
      detailedAnalysis,
      recommendations,
      medicalFlags
    };
  }

  /**
   * Analysis functions for different domains
   */
  private analyzeNeuromotorFunction(modalities: SimilarityScore['modalities']): InterpretationSection {
    const relevantFeatures = [
      ...modalities.keyboard.anomalies.filter(a => ['tremorInKeystrokes', 'motorSlowness'].includes(a.feature)),
      ...modalities.mouse.anomalies.filter(a => ['tremorAmplitude', 'motorControl'].includes(a.feature)),
      ...modalities.composite.anomalies.filter(a => ['globalNeuromotorIndex', 'bradykinesiaComposite'].includes(a.feature))
    ];

    const score = this.computeDomainScore(relevantFeatures, ['keyboard', 'mouse', 'composite'], modalities);
    const keyFindings = relevantFeatures.map(a => `${a.feature}: ${a.description}`);
    const riskFactors = relevantFeatures
      .filter(a => a.severity === 'high' || a.severity === 'critical')
      .map(a => a.feature);

    return {
      score,
      summary: this.generateNeuromotorSummary(score, keyFindings.length),
      keyFindings: keyFindings.slice(0, 3), // Top 3
      riskFactors
    };
  }

  private analyzeCognitiveFunction(modalities: SimilarityScore['modalities']): InterpretationSection {
    const relevantFeatures = [
      ...modalities.keyboard.anomalies.filter(a => ['cognitiveLoad', 'workingMemoryStrain', 'attentionalLapses'].includes(a.feature)),
      ...modalities.focus.anomalies.filter(a => ['attentionalControl', 'cognitiveFlexibility'].includes(a.feature)),
      ...modalities.composite.anomalies.filter(a => ['globalCognitiveLoad', 'attentionalCapacity'].includes(a.feature))
    ];

    const score = this.computeDomainScore(relevantFeatures, ['keyboard', 'focus', 'composite'], modalities);
    const keyFindings = relevantFeatures.map(a => `${a.feature}: ${a.description}`);
    const riskFactors = relevantFeatures
      .filter(a => a.medicalRelevance === 'high' || a.medicalRelevance === 'critical')
      .map(a => a.feature);

    return {
      score,
      summary: this.generateCognitiveSummary(score, keyFindings.length),
      keyFindings: keyFindings.slice(0, 3),
      riskFactors
    };
  }

  private analyzeTemporalPatterns(modalities: SimilarityScore['modalities']): InterpretationSection {
    const relevantFeatures = [
      ...modalities.keyboard.anomalies.filter(a => ['typingRhythm', 'syncopationIndex', 'microRhythm'].includes(a.feature)),
      ...modalities.composite.anomalies.filter(a => ['globalTimingEntropy', 'masterRhythm'].includes(a.feature))
    ];

    const score = this.computeDomainScore(relevantFeatures, ['keyboard', 'composite'], modalities);
    const keyFindings = relevantFeatures.map(a => `${a.feature}: ${a.description}`);
    const riskFactors = relevantFeatures
      .filter(a => a.severity === 'high' || a.severity === 'critical')
      .map(a => a.feature);

    return {
      score,
      summary: this.generateTemporalSummary(score, keyFindings.length),
      keyFindings: keyFindings.slice(0, 3),
      riskFactors
    };
  }

  private analyzeBehavioralConsistency(modalities: SimilarityScore['modalities']): InterpretationSection {
    const allAnomalies = Object.values(modalities).flatMap(m => m.anomalies);
    const consistencyScore = 1 - (allAnomalies.length / Math.max(1, Object.values(modalities).reduce((sum, m) => sum + m.featureCount, 0)));
    
    const keyFindings = [
      `Total anomalies detected: ${allAnomalies.length}`,
      `Consistency across modalities: ${(consistencyScore * 100).toFixed(1)}%`
    ];

    const riskFactors = allAnomalies
      .filter(a => a.severity === 'critical')
      .map(a => a.feature);

    return {
      score: consistencyScore,
      summary: this.generateConsistencySummary(consistencyScore, allAnomalies.length),
      keyFindings,
      riskFactors
    };
  }

  /**
   * Generate medical flags based on anomalies
   */
  private generateMedicalFlags(modalities: SimilarityScore['modalities']): MedicalFlag[] {
    const flags: MedicalFlag[] = [];
    const allAnomalies = Object.values(modalities).flatMap(m => m.anomalies);

    // Tremor detection
    const tremorAnomalies = allAnomalies.filter(a => 
      ['tremorInKeystrokes', 'tremorAmplitude', 'scrollTremor', 'globalNeuromotorIndex'].includes(a.feature)
    );

    if (tremorAnomalies.length >= 2) {
      const avgSeverity = this.getAverageSeverity(tremorAnomalies);
      flags.push({
        type: 'tremor',
        severity: avgSeverity,
        confidence: Math.min(0.9, tremorAnomalies.length * 0.25),
        description: `Multiple tremor indicators detected across ${tremorAnomalies.length} modalities`,
        recommendedAction: avgSeverity === 'high' || avgSeverity === 'critical' 
          ? 'Consider neurological evaluation' 
          : 'Monitor for progression'
      });
    }

    // Add other medical flags following similar pattern...
    
    return flags;
  }

  /**
   * Helper methods
   */
  private getDefaultConfiguration(): ScoringConfiguration {
    return {
      method: 'robust_statistical',
      weights: {
        keyboard: 0.3,
        mouse: 0.25,
        scroll: 0.15,
        focus: 0.2,
        composite: 0.1
      },
      anomalyThresholds: {
        low: 1.5,
        medium: 2.0,
        high: 2.5,
        critical: 3.0
      },
      interpretabilityLevel: 'medical',
      medicalFlagThresholds: {
        tremor: 2.0,
        bradykinesia: 2.5,
        cognitive_decline: 2.0
      }
    };
  }

  private createEmptyModalitySimilarity(modalityName: string): ModalitySimilarity {
    return {
      score: 0.5,
      weight: this.config.weights[modalityName as keyof typeof this.config.weights],
      featureCount: 0,
      anomalies: [],
      contributions: []
    };
  }

  private createErrorScore(timestamp: number): SimilarityScore {
    return {
      overall: 0.5,
      confidence: 0,
      timestamp,
      modalities: {
        keyboard: this.createEmptyModalitySimilarity('keyboard'),
        mouse: this.createEmptyModalitySimilarity('mouse'),
        scroll: this.createEmptyModalitySimilarity('scroll'),
        focus: this.createEmptyModalitySimilarity('focus'),
        composite: this.createEmptyModalitySimilarity('composite')
      },
      interpretation: {
        overallAssessment: 'Unable to compute similarity due to error',
        primaryConcerns: ['computation_error'],
        detailedAnalysis: {
          neuromotorFunction: { score: 0, summary: 'Analysis unavailable', keyFindings: [], riskFactors: [] },
          cognitiveFunction: { score: 0, summary: 'Analysis unavailable', keyFindings: [], riskFactors: [] },
          temporalPatterns: { score: 0, summary: 'Analysis unavailable', keyFindings: [], riskFactors: [] },
          behavioralConsistency: { score: 0, summary: 'Analysis unavailable', keyFindings: [], riskFactors: [] }
        },
        recommendations: [],
        medicalFlags: []
      },
      reliability: 0,
      coverage: 0
    };
  }

  private getFeatureImportance(feature: string, modalityName: string): number {
    // Define importance weights for different features
    const importanceMap: Record<string, number> = {
      // High importance features
      'meanDwell': 0.9,
      'typingRhythm': 0.85,
      'tremorAmplitude': 0.9,
      'globalTimingEntropy': 0.8,
      'focusRatio': 0.8,
      
      // Medium importance features  
      'velocityVariance': 0.6,
      'scrollTremor': 0.7,
      'cognitiveLoad': 0.75,
      
      // Lower importance features
      'entropy': 0.4,
      'sessionDuration': 0.3
    };

    return importanceMap[feature] || 0.5;
  }

  private getFeatureMedicalRelevance(feature: string, modalityName: string): FeatureAnomaly['medicalRelevance'] {
    // Define medical relevance for features
    const relevanceMap: Record<string, FeatureAnomaly['medicalRelevance']> = {
      'tremorInKeystrokes': 'critical',
      'tremorAmplitude': 'critical',
      'motorSlowness': 'high',
      'globalNeuromotorIndex': 'critical',
      'cognitiveLoad': 'medium',
      'attentionalControl': 'high',
      'typingRhythm': 'high'
    };

    return relevanceMap[feature] || 'low';
  }

  private computeWeightedScore(scores: number[], contributions: FeatureContribution[]): number {
    if (scores.length === 0) return 0.5;
    
    let weightedSum = 0;
    let totalWeight = 0;

    scores.forEach((score, i) => {
      const contribution = contributions[i];
      const weight = contribution.importance * contribution.reliability;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private computeReliability(modalities: SimilarityScore['modalities'], baseline: BaselinePattern): number {
    const reliabilities = Object.values(modalities)
      .flatMap(m => m.contributions.map(c => c.reliability * c.importance))
      .filter(r => r > 0);

    const avgReliability = reliabilities.length > 0 
      ? reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length
      : 0.5;

    return Math.min(avgReliability, baseline.statistics.confidence);
  }

  private computeCoverage(modalities: SimilarityScore['modalities']): number {
    const totalFeatures = Object.values(modalities).reduce((sum, m) => sum + m.featureCount, 0);
    const maxExpectedFeatures = 50; // Approximate total number of features
    return Math.min(1, totalFeatures / maxExpectedFeatures);
  }

  // Summary generation methods
  private generateOverallAssessment(score: number): string {
    if (score >= 0.9) return 'Behavioral patterns are highly consistent with established baseline';
    if (score >= 0.7) return 'Behavioral patterns show good consistency with minor variations';
    if (score >= 0.5) return 'Behavioral patterns show moderate deviations from baseline';
    if (score >= 0.3) return 'Behavioral patterns show significant changes from baseline';
    return 'Behavioral patterns show substantial deviations requiring attention';
  }

  private identifyPrimaryConcerns(modalities: SimilarityScore['modalities']): string[] {
    const concerns: string[] = [];
    const criticalAnomalies = Object.values(modalities)
      .flatMap(m => m.anomalies)
      .filter(a => a.severity === 'critical' || a.severity === 'high');

    criticalAnomalies.forEach(anomaly => {
      concerns.push(`${anomaly.feature}: ${anomaly.severity} deviation detected`);
    });

    return concerns.slice(0, 5); // Top 5 concerns
  }

  private generateRecommendations(modalities: SimilarityScore['modalities'], overallScore: number): string[] {
    const recommendations: string[] = [];
    
    if (overallScore < 0.5) {
      recommendations.push('Consider medical consultation for significant behavioral changes');
    }
    
    const tremorAnomalies = Object.values(modalities)
      .flatMap(m => m.anomalies)
      .filter(a => a.feature.toLowerCase().includes('tremor'));
    
    if (tremorAnomalies.length >= 2) {
      recommendations.push('Tremor patterns detected across multiple modalities - neurological evaluation recommended');
    }

    return recommendations;
  }

  private computeDomainScore(anomalies: FeatureAnomaly[], relevantModalities: string[], modalities: SimilarityScore['modalities']): number {
    const modalityScores = relevantModalities
      .map(modalityName => (modalities as any)[modalityName]?.score || 0.5);
    
    const avgScore = modalityScores.reduce((a, b) => a + b, 0) / modalityScores.length;
    const anomalyPenalty = Math.min(0.5, anomalies.length * 0.1);
    
    return Math.max(0, avgScore - anomalyPenalty);
  }

  private getAverageSeverity(anomalies: FeatureAnomaly[]): FeatureAnomaly['severity'] {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgScore = anomalies.reduce((sum, a) => sum + severityScores[a.severity], 0) / anomalies.length;
    
    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private generateAnomalyDescription(feature: string, current: number, baseline: number, zscore: number, modality: string): string {
    const direction = current > baseline ? 'increased' : 'decreased';
    const magnitude = zscore >= 3 ? 'substantially' : zscore >= 2 ? 'significantly' : 'moderately';
    return `${feature} ${direction} ${magnitude} (${current.toFixed(2)} vs baseline ${baseline.toFixed(2)})`;
  }

  private generateNeuromotorSummary(score: number, findingsCount: number): string {
    if (score >= 0.8) return 'Neuromotor function appears normal';
    if (score >= 0.6) return `Mild neuromotor variations noted (${findingsCount} findings)`;
    if (score >= 0.4) return `Moderate neuromotor concerns identified (${findingsCount} findings)`;
    return `Significant neuromotor abnormalities detected (${findingsCount} findings)`;
  }

  private generateCognitiveSummary(score: number, findingsCount: number): string {
    if (score >= 0.8) return 'Cognitive function appears normal';
    if (score >= 0.6) return `Mild cognitive variations noted (${findingsCount} findings)`;
    if (score >= 0.4) return `Moderate cognitive concerns identified (${findingsCount} findings)`;
    return `Significant cognitive abnormalities detected (${findingsCount} findings)`;
  }

  private generateTemporalSummary(score: number, findingsCount: number): string {
    if (score >= 0.8) return 'Temporal patterns are consistent';
    if (score >= 0.6) return `Minor timing irregularities noted (${findingsCount} findings)`;
    if (score >= 0.4) return `Moderate timing disruptions identified (${findingsCount} findings)`;
    return `Significant temporal abnormalities detected (${findingsCount} findings)`;
  }

  private generateConsistencySummary(score: number, anomalyCount: number): string {
    if (score >= 0.9) return 'Behavior is highly consistent across all modalities';
    if (score >= 0.7) return `Good behavioral consistency with ${anomalyCount} minor deviations`;
    if (score >= 0.5) return `Moderate consistency with ${anomalyCount} notable variations`;
    return `Low behavioral consistency with ${anomalyCount} significant deviations`;
  }

  /**
   * Update scoring configuration
   */
  updateConfiguration(config: Partial<ScoringConfiguration>): void {
    this.config = { ...this.config, ...config };
    logger.info('Similarity scoring configuration updated', { 
      method: this.config.method,
      interpretabilityLevel: this.config.interpretabilityLevel
    });
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ScoringConfiguration {
    return { ...this.config };
  }
}

export const similarityScoring = SimilarityScoring.getInstance();
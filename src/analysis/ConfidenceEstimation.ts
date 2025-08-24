/* eslint-disable no-trailing-spaces */
import { BaselinePattern } from './BaselineModeling';
import { SimilarityScore } from './SimilarityScoring';
import { DriftDetection } from './AdaptiveRecognition';
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('ConfidenceEstimation');

export interface ConfidenceAssessment {
  overall: number; // 0-1, overall confidence in assessment
  timestamp: number;
  
  // Confidence components
  components: {
    dataQuality: DataQualityConfidence;
    baselineReliability: BaselineReliabilityConfidence;
    featureCoverage: FeatureCoverageConfidence;
    temporalConsistency: TemporalConsistencyConfidence;
    medicalValidity: MedicalValidityConfidence;
  };
  
  // Uncertainty quantification
  uncertainty: UncertaintyQuantification;
  
  // Risk assessment
  riskFactors: RiskFactor[];
  
  // Recommendations for improving confidence
  recommendations: ConfidenceRecommendation[];
  
  // Metadata
  metadata: {
    assessmentVersion: string;
    computationTime: number;
    lastUpdated: number;
  };
}

export interface DataQualityConfidence {
  score: number; // 0-1
  factors: {
    signalToNoise: number; // Quality of raw data
    completeness: number; // Percentage of expected data present
    consistency: number; // Internal consistency checks
    artifactLevel: number; // Technical artifacts detected
  };
  issues: string[]; // Specific data quality issues
}

export interface BaselineReliabilityConfidence {
  score: number; // 0-1
  factors: {
    sampleSize: number; // Adequacy of baseline data
    timespan: number; // Duration over which baseline was collected
    stability: number; // How stable the baseline is
    representativeness: number; // How representative baseline is
  };
  concerns: string[]; // Reliability concerns
}

export interface FeatureCoverageConfidence {
  score: number; // 0-1
  factors: {
    modalityCoverage: number; // How many modalities are represented
    featureDensity: number; // Density of features per modality
    criticalFeatures: number; // Coverage of medically critical features
    redundancy: number; // Overlapping feature measurements
  };
  missingFeatures: string[]; // Important missing features
}

export interface TemporalConsistencyConfidence {
  score: number; // 0-1
  factors: {
    timeAlignment: number; // How well-aligned measurements are
    sessionQuality: number; // Quality of individual sessions
    longitudinalConsistency: number; // Consistency over time
    environmentalStability: number; // Stable environmental conditions
  };
  inconsistencies: string[]; // Temporal inconsistencies found
}

export interface MedicalValidityConfidence {
  score: number; // 0-1
  factors: {
    clinicalRelevance: number; // Medical relevance of detected patterns
    evidenceSupport: number; // Support from medical literature
    differentialDiagnosis: number; // Ability to distinguish conditions
    progressionPatterns: number; // Consistency with known disease progression
  };
  validationConcerns: string[]; // Medical validity concerns
}

export interface UncertaintyQuantification {
  epistemic: EpistemicUncertainty; // Uncertainty due to lack of knowledge
  aleatoric: AleatoricUncertainty; // Uncertainty due to inherent variability
  combined: CombinedUncertainty; // Overall uncertainty metrics
}

export interface EpistemicUncertainty {
  modelUncertainty: number; // 0-1, uncertainty in the model itself
  featureUncertainty: number; // Uncertainty in feature extraction
  baselineUncertainty: number; // Uncertainty in baseline establishment
  interpretationUncertainty: number; // Uncertainty in medical interpretation
}

export interface AleatoricUncertainty {
  measurementNoise: number; // Random measurement errors
  biologicalVariability: number; // Natural biological variation
  environmentalVariability: number; // Environmental effects
  behavioralVariability: number; // Normal behavioral changes
}

export interface CombinedUncertainty {
  totalUncertainty: number; // 0-1, combined uncertainty score
  confidenceInterval: [number, number]; // 95% confidence interval for assessment
  predictionInterval: [number, number]; // 95% prediction interval
  reliabilityBounds: {
    lower: number; // Conservative estimate
    upper: number; // Optimistic estimate
  };
}

export interface RiskFactor {
  type: 'data' | 'baseline' | 'temporal' | 'medical' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // 0-1, impact on overall confidence
  mitigation?: string; // How to address this risk factor
}

export interface ConfidenceRecommendation {
  type: 'data_collection' | 'baseline_improvement' | 'feature_enhancement' | 'validation' | 'medical_consultation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  expectedImprovement: number; // Expected confidence improvement (0-1)
  effort: 'minimal' | 'moderate' | 'substantial' | 'extensive';
}

export interface ConfidenceHistory {
  userId: string;
  assessments: ConfidenceAssessment[];
  trends: {
    overallTrend: number; // -1 to 1, negative means decreasing confidence
    dataQualityTrend: number;
    baselineTrend: number;
    featureTrend: number;
  };
}

export class ConfidenceEstimation {
  private static instance: ConfidenceEstimation;
  private confidenceHistory = new Map<string, ConfidenceHistory>();
  
  // Confidence calculation weights
  private weights = {
    dataQuality: 0.25,
    baselineReliability: 0.25,
    featureCoverage: 0.20,
    temporalConsistency: 0.15,
    medicalValidity: 0.15
  };

  private constructor() {}

  static getInstance(): ConfidenceEstimation {
    if (!ConfidenceEstimation.instance) {
      ConfidenceEstimation.instance = new ConfidenceEstimation();
    }
    return ConfidenceEstimation.instance;
  }

  /**
   * Assess confidence in a similarity score and baseline
   */
  async assessConfidence(
    userId: string,
    similarityScore: SimilarityScore,
    baseline: BaselinePattern,
    recentScores?: SimilarityScore[],
    driftDetection?: DriftDetection
  ): Promise<ConfidenceAssessment> {
    
    const startTime = performance.now();
    
    try {
      // Assess each confidence component
      const dataQuality = this.assessDataQuality(similarityScore, baseline);
      const baselineReliability = this.assessBaselineReliability(baseline);
      const featureCoverage = this.assessFeatureCoverage(similarityScore, baseline);
      const temporalConsistency = this.assessTemporalConsistency(similarityScore, recentScores, baseline);
      const medicalValidity = this.assessMedicalValidity(similarityScore, driftDetection);

      // Compute overall confidence
      const overall = this.computeOverallConfidence({
        dataQuality,
        baselineReliability,
        featureCoverage,
        temporalConsistency,
        medicalValidity
      });

      // Quantify uncertainty
      const uncertainty = this.quantifyUncertainty(
        similarityScore,
        baseline,
        { dataQuality, baselineReliability, featureCoverage, temporalConsistency, medicalValidity }
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(
        { dataQuality, baselineReliability, featureCoverage, temporalConsistency, medicalValidity },
        driftDetection
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        { dataQuality, baselineReliability, featureCoverage, temporalConsistency, medicalValidity },
        riskFactors
      );

      const assessment: ConfidenceAssessment = {
        overall,
        timestamp: Date.now(),
        components: {
          dataQuality,
          baselineReliability,
          featureCoverage,
          temporalConsistency,
          medicalValidity
        },
        uncertainty,
        riskFactors,
        recommendations,
        metadata: {
          assessmentVersion: '1.0.0',
          computationTime: performance.now() - startTime,
          lastUpdated: Date.now()
        }
      };

      // Update confidence history
      this.updateConfidenceHistory(userId, assessment);

      logger.debug('Confidence assessment completed', {
        userId,
        overallConfidence: overall,
        computationTime: Math.round(assessment.metadata.computationTime),
        riskFactorCount: riskFactors.length
      });

      return assessment;

    } catch (error) {
      logger.error('Failed to assess confidence', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.createErrorAssessment();
    }
  }

  /**
   * Assess data quality confidence
   */
  private assessDataQuality(score: SimilarityScore, baseline: BaselinePattern): DataQualityConfidence {
    // Signal to noise ratio
    const signalToNoise = Math.min(1, score.reliability * 1.2);
    
    // Completeness based on coverage
    const completeness = score.coverage;
    
    // Consistency from similarity score confidence
    const consistency = score.confidence;
    
    // Artifact level (inverse of data quality issues)
    const totalAnomalies = Object.values(score.modalities).reduce((sum, m) => sum + m.anomalies.length, 0);
    const expectedFeatures = Object.values(score.modalities).reduce((sum, m) => sum + m.featureCount, 0);
    const artifactLevel = expectedFeatures > 0 ? 1 - (totalAnomalies / expectedFeatures) : 1;
    
    const overallScore = (signalToNoise * 0.3) + (completeness * 0.3) + (consistency * 0.25) + (artifactLevel * 0.15);
    
    const issues: string[] = [];
    if (signalToNoise < 0.6) issues.push('Low signal-to-noise ratio in measurements');
    if (completeness < 0.7) issues.push('Incomplete feature coverage');
    if (consistency < 0.6) issues.push('Inconsistent data quality across sessions');
    if (artifactLevel < 0.8) issues.push('High level of measurement artifacts detected');

    return {
      score: Math.max(0, Math.min(1, overallScore)),
      factors: { signalToNoise, completeness, consistency, artifactLevel },
      issues
    };
  }

  /**
   * Assess baseline reliability confidence
   */
  private assessBaselineReliability(baseline: BaselinePattern): BaselineReliabilityConfidence {
    // Sample size adequacy
    const minSamples = 50;
    const sampleSize = Math.min(1, baseline.statistics.sampleCount / minSamples);
    
    // Timespan adequacy (prefer at least 2 weeks)
    const minTimespan = 14 * 24 * 60 * 60 * 1000; // 2 weeks in ms
    const currentAge = Date.now() - baseline.timestamp;
    const timespan = Math.min(1, currentAge / minTimespan);
    
    // Stability from baseline metadata
    const stability = baseline.statistics.stability;
    
    // Representativeness from baseline confidence
    const representativeness = baseline.statistics.confidence;
    
    const overallScore = (sampleSize * 0.3) + (timespan * 0.2) + (stability * 0.3) + (representativeness * 0.2);
    
    const concerns: string[] = [];
    if (sampleSize < 0.5) concerns.push('Insufficient baseline data samples');
    if (timespan < 0.5) concerns.push('Baseline timespan too short for reliable patterns');
    if (stability < 0.6) concerns.push('Baseline shows high variability');
    if (representativeness < 0.7) concerns.push('Baseline may not be representative');

    return {
      score: Math.max(0, Math.min(1, overallScore)),
      factors: { sampleSize, timespan, stability, representativeness },
      concerns
    };
  }

  /**
   * Assess feature coverage confidence
   */
  private assessFeatureCoverage(score: SimilarityScore, baseline: BaselinePattern): FeatureCoverageConfidence {
    const modalities = Object.keys(score.modalities);
    const totalModalities = 5; // keyboard, mouse, scroll, focus, composite
    
    // Modality coverage
    const modalityCoverage = modalities.length / totalModalities;
    
    // Feature density
    const totalFeatures = Object.values(score.modalities).reduce((sum, m) => sum + m.featureCount, 0);
    const expectedFeatures = 50; // Approximate expected total
    const featureDensity = Math.min(1, totalFeatures / expectedFeatures);
    
    // Critical features coverage
    const criticalFeatureNames = [
      'meanDwell', 'typingRhythm', 'tremorAmplitude', 'focusRatio', 
      'globalTimingEntropy', 'globalNeuromotorIndex'
    ];
    
    let criticalFeaturesCovered = 0;
    Object.values(score.modalities).forEach(modality => {
      modality.contributions.forEach(contrib => {
        if (criticalFeatureNames.includes(contrib.feature)) {
          criticalFeaturesCovered++;
        }
      });
    });
    
    const criticalFeatures = Math.min(1, criticalFeaturesCovered / criticalFeatureNames.length);
    
    // Redundancy (multiple measurements of similar concepts)
    const redundancy = totalFeatures > 20 ? Math.min(1, (totalFeatures - 20) / 20) : 0;
    
    const overallScore = (modalityCoverage * 0.3) + (featureDensity * 0.3) + (criticalFeatures * 0.3) + (redundancy * 0.1);
    
    const missingFeatures: string[] = [];
    if (modalityCoverage < 0.8) {
      const presentModalities = new Set(modalities);
      const allModalities = ['keyboard', 'mouse', 'scroll', 'focus', 'composite'];
      allModalities.forEach(mod => {
        if (!presentModalities.has(mod)) {
          missingFeatures.push(mod);
        }
      });
    }

    return {
      score: Math.max(0, Math.min(1, overallScore)),
      factors: { modalityCoverage, featureDensity, criticalFeatures, redundancy },
      missingFeatures
    };
  }

  /**
   * Assess temporal consistency confidence
   */
  private assessTemporalConsistency(
    score: SimilarityScore, 
    recentScores?: SimilarityScore[], 
    baseline?: BaselinePattern
  ): TemporalConsistencyConfidence {
    
    // Time alignment (how well-synchronized the measurements are)
    const timeAlignment = score.reliability; // Proxy for temporal alignment
    
    // Session quality
    const sessionQuality = score.confidence;
    
    // Longitudinal consistency
    let longitudinalConsistency = 0.5;
    if (recentScores && recentScores.length > 1) {
      const recentConfidences = recentScores.map(s => s.confidence);
      const mean = recentConfidences.reduce((a, b) => a + b, 0) / recentConfidences.length;
      const variance = recentConfidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / recentConfidences.length;
      longitudinalConsistency = mean * (1 - Math.sqrt(variance)); // High mean, low variance = high consistency
    }
    
    // Environmental stability (based on baseline environmental context)
    const environmentalStability = baseline?.statistics.confidence || 0.7;
    
    const overallScore = (timeAlignment * 0.25) + (sessionQuality * 0.25) + (longitudinalConsistency * 0.3) + (environmentalStability * 0.2);
    
    const inconsistencies: string[] = [];
    if (timeAlignment < 0.6) inconsistencies.push('Poor temporal alignment of measurements');
    if (sessionQuality < 0.6) inconsistencies.push('Variable session quality over time');
    if (longitudinalConsistency < 0.6) inconsistencies.push('Inconsistent patterns over multiple sessions');
    if (environmentalStability < 0.6) inconsistencies.push('Unstable environmental conditions');

    return {
      score: Math.max(0, Math.min(1, overallScore)),
      factors: { timeAlignment, sessionQuality, longitudinalConsistency, environmentalStability },
      inconsistencies
    };
  }

  /**
   * Assess medical validity confidence
   */
  private assessMedicalValidity(score: SimilarityScore, driftDetection?: DriftDetection): MedicalValidityConfidence {
    // Clinical relevance based on detected medical flags
    const medicalFlags = score.interpretation.medicalFlags;
    const criticalFlags = medicalFlags.filter(f => f.severity === 'high' || f.severity === 'critical');
    const clinicalRelevance = medicalFlags.length > 0 ? 
      (criticalFlags.length / medicalFlags.length * 0.7) + 0.3 : 0.5;
    
    // Evidence support (simplified - in practice would reference medical literature)
    const evidenceSupport = 0.8; // Assume good evidence support for now
    
    // Differential diagnosis capability
    const modalityCount = Object.values(score.modalities).filter(m => m.featureCount > 0).length;
    const differentialDiagnosis = Math.min(1, modalityCount / 4); // Multi-modal better for differential diagnosis
    
    // Progression patterns consistency
    let progressionPatterns = 0.7;
    if (driftDetection) {
      progressionPatterns = driftDetection.confidence * 
        (driftDetection.likelyDiseaseProgression ? 0.9 : 0.6);
    }
    
    const overallScore = (clinicalRelevance * 0.3) + (evidenceSupport * 0.2) + (differentialDiagnosis * 0.25) + (progressionPatterns * 0.25);
    
    const validationConcerns: string[] = [];
    if (clinicalRelevance < 0.6) validationConcerns.push('Limited clinical relevance of detected patterns');
    if (differentialDiagnosis < 0.6) validationConcerns.push('Insufficient data for differential diagnosis');
    if (progressionPatterns < 0.6) validationConcerns.push('Patterns inconsistent with known disease progression');

    return {
      score: Math.max(0, Math.min(1, overallScore)),
      factors: { clinicalRelevance, evidenceSupport, differentialDiagnosis, progressionPatterns },
      validationConcerns
    };
  }

  /**
   * Compute overall confidence from components
   */
  private computeOverallConfidence(components: {
    dataQuality: DataQualityConfidence;
    baselineReliability: BaselineReliabilityConfidence;
    featureCoverage: FeatureCoverageConfidence;
    temporalConsistency: TemporalConsistencyConfidence;
    medicalValidity: MedicalValidityConfidence;
  }): number {
    
    const weightedScore = 
      (components.dataQuality.score * this.weights.dataQuality) +
      (components.baselineReliability.score * this.weights.baselineReliability) +
      (components.featureCoverage.score * this.weights.featureCoverage) +
      (components.temporalConsistency.score * this.weights.temporalConsistency) +
      (components.medicalValidity.score * this.weights.medicalValidity);

    return Math.max(0, Math.min(1, weightedScore));
  }

  /**
   * Quantify uncertainty in the assessment
   */
  private quantifyUncertainty(
    score: SimilarityScore,
    baseline: BaselinePattern,
    components: any
  ): UncertaintyQuantification {
    
    // Epistemic uncertainty (knowledge-based)
    const modelUncertainty = 0.15; // Inherent model uncertainty
    const featureUncertainty = 1 - score.reliability;
    const baselineUncertainty = 1 - baseline.statistics.confidence;
    const interpretationUncertainty = 0.2; // Uncertainty in medical interpretation
    
    const epistemic: EpistemicUncertainty = {
      modelUncertainty,
      featureUncertainty,
      baselineUncertainty,
      interpretationUncertainty
    };

    // Aleatoric uncertainty (variability-based)
    const measurementNoise = 1 - components.dataQuality.factors.signalToNoise;
    const biologicalVariability = 0.1; // Natural biological variation
    const environmentalVariability = 1 - components.temporalConsistency.factors.environmentalStability;
    const behavioralVariability = Math.max(0, 1 - score.overall) * 0.5; // Behavioral changes
    
    const aleatoric: AleatoricUncertainty = {
      measurementNoise,
      biologicalVariability,
      environmentalVariability,
      behavioralVariability
    };

    // Combined uncertainty
    const epistemicTotal = (modelUncertainty + featureUncertainty + baselineUncertainty + interpretationUncertainty) / 4;
    const aleatoricTotal = (measurementNoise + biologicalVariability + environmentalVariability + behavioralVariability) / 4;
    
    const totalUncertainty = Math.sqrt(epistemicTotal * epistemicTotal + aleatoricTotal * aleatoricTotal);
    
    // Confidence and prediction intervals (simplified)
    const margin = 1.96 * totalUncertainty; // 95% intervals
    const confidenceInterval: [number, number] = [
      Math.max(0, score.overall - margin * 0.7),
      Math.min(1, score.overall + margin * 0.7)
    ];
    
    const predictionInterval: [number, number] = [
      Math.max(0, score.overall - margin),
      Math.min(1, score.overall + margin)
    ];
    
    const combined: CombinedUncertainty = {
      totalUncertainty,
      confidenceInterval,
      predictionInterval,
      reliabilityBounds: {
        lower: Math.max(0, score.overall - totalUncertainty),
        upper: Math.min(1, score.overall + totalUncertainty)
      }
    };

    return { epistemic, aleatoric, combined };
  }

  /**
   * Identify risk factors affecting confidence
   */
  private identifyRiskFactors(components: any, driftDetection?: DriftDetection): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Data quality risks
    if (components.dataQuality.score < 0.6) {
      risks.push({
        type: 'data',
        severity: components.dataQuality.score < 0.4 ? 'high' : 'medium',
        description: 'Poor data quality affecting measurement reliability',
        impact: (0.8 - components.dataQuality.score) * 0.5,
        mitigation: 'Improve data collection environment and procedures'
      });
    }

    // Baseline risks
    if (components.baselineReliability.score < 0.7) {
      risks.push({
        type: 'baseline',
        severity: components.baselineReliability.score < 0.5 ? 'high' : 'medium',
        description: 'Baseline reliability concerns affecting comparison accuracy',
        impact: (0.9 - components.baselineReliability.score) * 0.4,
        mitigation: 'Collect additional baseline data over longer time period'
      });
    }

    // Feature coverage risks
    if (components.featureCoverage.score < 0.6) {
      risks.push({
        type: 'data',
        severity: 'medium',
        description: 'Incomplete feature coverage limiting assessment scope',
        impact: (0.8 - components.featureCoverage.score) * 0.3,
        mitigation: 'Enable additional data collection modalities'
      });
    }

    // Temporal consistency risks
    if (components.temporalConsistency.score < 0.6) {
      risks.push({
        type: 'temporal',
        severity: 'medium',
        description: 'Temporal inconsistencies affecting longitudinal assessment',
        impact: (0.7 - components.temporalConsistency.score) * 0.3,
        mitigation: 'Standardize measurement timing and environmental conditions'
      });
    }

    // Drift-related risks
    if (driftDetection?.isDrifting && driftDetection.confidence > 0.7) {
      risks.push({
        type: 'medical',
        severity: driftDetection.driftSeverity === 'severe' ? 'critical' : 
                  driftDetection.driftSeverity === 'significant' ? 'high' : 'medium',
        description: `Significant pattern drift detected: ${driftDetection.driftType}`,
        impact: driftDetection.driftMagnitude * 0.6,
        mitigation: 'Medical evaluation recommended for pattern changes'
      });
    }

    return risks.sort((a, b) => b.impact - a.impact); // Sort by impact, highest first
  }

  /**
   * Generate recommendations for improving confidence
   */
  private generateRecommendations(components: any, riskFactors: RiskFactor[]): ConfidenceRecommendation[] {
    const recommendations: ConfidenceRecommendation[] = [];

    // Data quality improvements
    if (components.dataQuality.score < 0.7) {
      recommendations.push({
        type: 'data_collection',
        priority: components.dataQuality.score < 0.5 ? 'high' : 'medium',
        description: 'Improve data collection environment and reduce measurement artifacts',
        expectedImprovement: (0.8 - components.dataQuality.score) * 0.5,
        effort: 'moderate'
      });
    }

    // Baseline improvements
    if (components.baselineReliability.score < 0.8) {
      recommendations.push({
        type: 'baseline_improvement',
        priority: components.baselineReliability.score < 0.6 ? 'high' : 'medium',
        description: 'Collect additional baseline data to improve reliability',
        expectedImprovement: (0.9 - components.baselineReliability.score) * 0.4,
        effort: 'substantial'
      });
    }

    // Feature coverage improvements
    if (components.featureCoverage.score < 0.8) {
      recommendations.push({
        type: 'feature_enhancement',
        priority: 'medium',
        description: 'Enable additional measurement modalities for better coverage',
        expectedImprovement: (0.85 - components.featureCoverage.score) * 0.3,
        effort: 'moderate'
      });
    }

    // Medical validation
    if (components.medicalValidity.score < 0.7) {
      recommendations.push({
        type: 'validation',
        priority: 'medium',
        description: 'Validate findings with clinical assessment',
        expectedImprovement: (0.8 - components.medicalValidity.score) * 0.3,
        effort: 'extensive'
      });
    }

    // High-risk recommendations
    const criticalRisks = riskFactors.filter(r => r.severity === 'critical' || r.severity === 'high');
    if (criticalRisks.length > 0) {
      recommendations.push({
        type: 'medical_consultation',
        priority: 'urgent',
        description: 'Immediate medical consultation recommended due to high-risk findings',
        expectedImprovement: 0.2,
        effort: 'minimal'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  /**
   * Update confidence history for a user
   */
  private updateConfidenceHistory(userId: string, assessment: ConfidenceAssessment): void {
    if (!this.confidenceHistory.has(userId)) {
      this.confidenceHistory.set(userId, {
        userId,
        assessments: [],
        trends: { overallTrend: 0, dataQualityTrend: 0, baselineTrend: 0, featureTrend: 0 }
      });
    }

    const history = this.confidenceHistory.get(userId)!;
    history.assessments.push(assessment);

    // Maintain rolling window (keep last 50 assessments)
    if (history.assessments.length > 50) {
      history.assessments = history.assessments.slice(-50);
    }

    // Update trends
    if (history.assessments.length >= 5) {
      const recent = history.assessments.slice(-5);
      const older = history.assessments.slice(-10, -5);

      if (older.length > 0) {
        history.trends.overallTrend = this.calculateTrend(recent.map(a => a.overall), older.map(a => a.overall));
        history.trends.dataQualityTrend = this.calculateTrend(
          recent.map(a => a.components.dataQuality.score), 
          older.map(a => a.components.dataQuality.score)
        );
        history.trends.baselineTrend = this.calculateTrend(
          recent.map(a => a.components.baselineReliability.score),
          older.map(a => a.components.baselineReliability.score)
        );
        history.trends.featureTrend = this.calculateTrend(
          recent.map(a => a.components.featureCoverage.score),
          older.map(a => a.components.featureCoverage.score)
        );
      }
    }
  }

  /**
   * Calculate trend between two periods
   */
  private calculateTrend(recent: number[], older: number[]): number {
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  /**
   * Create error assessment
   */
  private createErrorAssessment(): ConfidenceAssessment {
    const dataQualityEmpty: DataQualityConfidence = {
      score: 0,
      factors: { signalToNoise: 0, completeness: 0, consistency: 0, artifactLevel: 1 },
      issues: ['Assessment failed due to error']
    };
    const baselineReliabilityEmpty: BaselineReliabilityConfidence = {
      score: 0,
      factors: { sampleSize: 0, timespan: 0, stability: 0, representativeness: 0 },
      concerns: ['Assessment failed due to error']
    };
    const featureCoverageEmpty: FeatureCoverageConfidence = {
      score: 0,
      factors: { modalityCoverage: 0, featureDensity: 0, criticalFeatures: 0, redundancy: 0 },
      missingFeatures: []
    };
    const temporalConsistencyEmpty: TemporalConsistencyConfidence = {
      score: 0,
      factors: { timeAlignment: 0, sessionQuality: 0, longitudinalConsistency: 0, environmentalStability: 0 },
      inconsistencies: []
    };
    const medicalValidityEmpty: MedicalValidityConfidence = {
      score: 0,
      factors: { clinicalRelevance: 0, evidenceSupport: 0, differentialDiagnosis: 0, progressionPatterns: 0 },
      validationConcerns: ['Assessment failed due to error']
    };

    return {
      overall: 0,
      timestamp: Date.now(),
      components: {
  dataQuality: dataQualityEmpty,
  baselineReliability: baselineReliabilityEmpty,
  featureCoverage: featureCoverageEmpty,
  temporalConsistency: temporalConsistencyEmpty,
  medicalValidity: medicalValidityEmpty
      },
      uncertainty: {
        epistemic: { modelUncertainty: 1, featureUncertainty: 1, baselineUncertainty: 1, interpretationUncertainty: 1 },
        aleatoric: { measurementNoise: 1, biologicalVariability: 1, environmentalVariability: 1, behavioralVariability: 1 },
        combined: {
          totalUncertainty: 1,
          confidenceInterval: [0, 1],
          predictionInterval: [0, 1],
          reliabilityBounds: { lower: 0, upper: 0 }
        }
      },
      riskFactors: [{
        type: 'technical',
        severity: 'critical',
        description: 'Confidence assessment failed',
        impact: 1
      }],
      recommendations: [{
        type: 'validation',
        priority: 'urgent',
        description: 'Technical issue requires immediate attention',
        expectedImprovement: 0,
        effort: 'extensive'
      }],
      metadata: {
        assessmentVersion: '1.0.0',
        computationTime: 0,
        lastUpdated: Date.now()
      }
    };
  }

  /**
   * Get confidence history for a user
   */
  getConfidenceHistory(userId: string): ConfidenceHistory | null {
    return this.confidenceHistory.get(userId) || null;
  }

  /**
   * Update confidence calculation weights
   */
  updateWeights(newWeights: Partial<typeof ConfidenceEstimation.prototype.weights>): void {
    Object.assign(this.weights, newWeights);
    logger.info('Confidence estimation weights updated', { weights: this.weights });
  }

  /**
   * Get statistics
   */
  getStats() {
    const histories = Array.from(this.confidenceHistory.values());
    
    return {
      totalUsers: histories.length,
      totalAssessments: histories.reduce((sum, h) => sum + h.assessments.length, 0),
      averageConfidence: histories.reduce((sum, h) => {
        if (h.assessments.length === 0) return sum;
        const avgUserConfidence = h.assessments.reduce((s, a) => s + a.overall, 0) / h.assessments.length;
        return sum + avgUserConfidence;
      }, 0) / Math.max(1, histories.length),
      confidenceTrends: {
        improving: histories.filter(h => h.trends.overallTrend > 0.05).length,
        stable: histories.filter(h => Math.abs(h.trends.overallTrend) <= 0.05).length,
        declining: histories.filter(h => h.trends.overallTrend < -0.05).length
      }
    };
  }
}

export const confidenceEstimation = ConfidenceEstimation.getInstance();
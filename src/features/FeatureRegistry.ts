/* eslint-disable no-trailing-spaces */
import { createComponentLogger } from '../utils/Logger';

const logger = createComponentLogger('FeatureRegistry');

export type FeatureType = 
  | 'keystroke' 
  | 'mouse' 
  | 'voice' 
  | 'eye' 
  | 'scroll' 
  | 'focus' 
  | 'composite';

export interface FeatureDefinition<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  type: FeatureType;
  version: string;
  dependencies?: string[];
  priority: number; // Higher priority features computed first
  enabled: boolean;
  compute: (input: TInput) => TOutput | Promise<TOutput>;
  validate?: (output: TOutput) => boolean;
  metadata?: {
    unit?: string;
    range?: [number, number];
    interpretationHints?: string[];
    medicalRelevance?: 'low' | 'medium' | 'high' | 'critical';
    reliability?: number; // 0-1 confidence in feature accuracy
  };
}

export interface FeatureComputeResult<T = any> {
  featureId: string;
  value: T;
  timestamp: number;
  quality: number; // 0-1 quality score
  metadata?: Record<string, any>;
  error?: string;
}

export interface FeatureBatch {
  sessionId: string;
  timestamp: number;
  results: FeatureComputeResult[];
  totalComputed: number;
  totalErrors: number;
  computeDuration: number;
}

export class FeatureRegistry {
  private static instance: FeatureRegistry;
  private features = new Map<string, FeatureDefinition>();
  private computeCallbacks = new Set<(batch: FeatureBatch) => void>();
  private isComputing = false;
  private computeQueue: Array<{ inputs: any[]; sessionId: string; resolve: (batch: FeatureBatch) => void; reject: (error: Error) => void; }> = [];

  private constructor() {}

  static getInstance(): FeatureRegistry {
    if (!FeatureRegistry.instance) {
      FeatureRegistry.instance = new FeatureRegistry();
    }
    return FeatureRegistry.instance;
  }

  /**
   * Register a feature extractor
   */
  register<TInput, TOutput>(definition: FeatureDefinition<TInput, TOutput>): void {
    if (this.features.has(definition.id)) {
      logger.warn('Feature already registered, replacing', { featureId: definition.id });
    }

    // Validate dependencies exist
    if (definition.dependencies) {
      for (const depId of definition.dependencies) {
        if (!this.features.has(depId)) {
          throw new Error(`Feature dependency not found: ${depId} (required by ${definition.id})`);
        }
      }
    }

    this.features.set(definition.id, definition);
    logger.info('Feature registered', { 
      featureId: definition.id, 
      type: definition.type,
      hasDependencies: !!definition.dependencies?.length 
    });
  }

  /**
   * Unregister a feature extractor
   */
  unregister(featureId: string): void {
    if (!this.features.has(featureId)) {
      logger.warn('Attempted to unregister unknown feature', { featureId });
      return;
    }

    // Check if any other features depend on this one
    const dependents = Array.from(this.features.values())
      .filter(f => f.dependencies?.includes(featureId))
      .map(f => f.id);

    if (dependents.length > 0) {
      throw new Error(`Cannot unregister feature ${featureId}: required by ${dependents.join(', ')}`);
    }

    this.features.delete(featureId);
    logger.info('Feature unregistered', { featureId });
  }

  /**
   * Get all registered features of a specific type
   */
  getByType(type: FeatureType): FeatureDefinition[] {
    return Array.from(this.features.values())
      .filter(f => f.type === type && f.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all enabled features
   */
  getEnabled(): FeatureDefinition[] {
    return Array.from(this.features.values())
      .filter(f => f.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enable or disable a feature
   */
  setEnabled(featureId: string, enabled: boolean): void {
    const feature = this.features.get(featureId);
    if (!feature) {
      logger.warn('Attempted to enable/disable unknown feature', { featureId });
      return;
    }

    if (!enabled) {
      // Check if any enabled features depend on this one
      const enabledDependents = Array.from(this.features.values())
        .filter(f => f.enabled && f.dependencies?.includes(featureId))
        .map(f => f.id);

      if (enabledDependents.length > 0) {
        logger.warn('Cannot disable feature: required by enabled dependents', {
          featureId,
          dependents: enabledDependents
        });
        return;
      }
    }

    feature.enabled = enabled;
    logger.info('Feature enabled state changed', { featureId, enabled });
  }

  /**
   * Compute features for given inputs
   */
  async compute(inputs: any[], sessionId: string): Promise<FeatureBatch> {
    return new Promise((resolve, reject) => {
      this.computeQueue.push({ inputs, sessionId, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isComputing || this.computeQueue.length === 0) {
      return;
    }

    this.isComputing = true;
    const { inputs, sessionId, resolve, reject } = this.computeQueue.shift()!;

    try {
      const batch = await this.computeBatch(inputs, sessionId);
      resolve(batch);
    } catch (error) {
      reject(error as Error);
    } finally {
      this.isComputing = false;
      // Process next in queue
      if (this.computeQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  private async computeBatch(inputs: any[], sessionId: string): Promise<FeatureBatch> {
    const startTime = performance.now();
    const results: FeatureComputeResult[] = [];
    const enabledFeatures = this.getEnabled();
    let totalErrors = 0;

    logger.debug('Computing feature batch', { 
      sessionId, 
      inputCount: inputs.length, 
      featureCount: enabledFeatures.length 
    });

    // Sort features by dependency order and priority
    const orderedFeatures = this.topologicalSort(enabledFeatures);
    const computedValues = new Map<string, any>();

    for (const feature of orderedFeatures) {
      try {
        // Prepare input for this feature
  let featureInput: any = inputs;
        
        // If feature has dependencies, include their computed values
        if (feature.dependencies) {
          const depValues: Record<string, any> = {};
          for (const depId of feature.dependencies) {
            depValues[depId] = computedValues.get(depId);
          }
          // Pass dependency values directly if feature expects an object; otherwise original inputs
          // Heuristic: if compute function length === 1 and first enabled feature produced an object, pass depValues
          featureInput = depValues;
        }

        const computeStart = performance.now();
        const value = await feature.compute(featureInput);
        const computeDuration = performance.now() - computeStart;

        // Validate output if validator provided
        let isValid = true;
        if (feature.validate) {
          isValid = feature.validate(value);
        }

        if (isValid) {
          computedValues.set(feature.id, value);
          results.push({
            featureId: feature.id,
            value,
            timestamp: Date.now(),
            quality: this.computeQualityScore(value, feature, computeDuration),
            metadata: {
              computeDuration,
              inputCount: inputs.length,
              featureType: feature.type
            }
          });
        } else {
          totalErrors++;
          results.push({
            featureId: feature.id,
            value: null,
            timestamp: Date.now(),
            quality: 0,
            error: 'Validation failed'
          });
        }

      } catch (error) {
        totalErrors++;
        logger.error('Feature computation failed', { 
          featureId: feature.id, 
          error: error instanceof Error ? error.message : String(error)
        });
        results.push({
          featureId: feature.id,
          value: null,
          timestamp: Date.now(),
          quality: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const batch: FeatureBatch = {
      sessionId,
      timestamp: Date.now(),
      results,
      totalComputed: results.filter(r => !r.error).length,
      totalErrors,
      computeDuration: performance.now() - startTime
    };

    logger.debug('Feature batch computed', {
      sessionId,
      totalComputed: batch.totalComputed,
      totalErrors,
      duration: batch.computeDuration
    });

    // Notify subscribers
    this.computeCallbacks.forEach(callback => {
      try {
        callback(batch);
      } catch (error) {
        logger.error('Feature compute callback error', { error });
      }
    });

    return batch;
  }

  private topologicalSort(features: FeatureDefinition[]): FeatureDefinition[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: FeatureDefinition[] = [];
    const featureMap = new Map(features.map(f => [f.id, f]));

    const visit = (featureId: string) => {
      if (temp.has(featureId)) {
        throw new Error(`Circular dependency detected involving feature: ${featureId}`);
      }
      if (visited.has(featureId)) {
        return;
      }

      temp.add(featureId);
      const feature = featureMap.get(featureId);
      
      if (feature?.dependencies) {
        for (const depId of feature.dependencies) {
          if (featureMap.has(depId)) {
            visit(depId);
          }
        }
      }
      
      temp.delete(featureId);
      visited.add(featureId);
      if (feature) {
        result.push(feature);
      }
    };

    // Sort by priority first, then handle dependencies
    const sortedByPriority = features.sort((a, b) => b.priority - a.priority);
    
    for (const feature of sortedByPriority) {
      if (!visited.has(feature.id)) {
        visit(feature.id);
      }
    }

    return result;
  }

  private computeQualityScore(value: any, feature: FeatureDefinition, computeDuration: number): number {
    let quality = 1.0;

    // Penalize very fast computations (might be cached/invalid)
    if (computeDuration < 0.1) {
      quality *= 0.8;
    }

    // Penalize very slow computations
    if (computeDuration > 100) {
      quality *= Math.max(0.5, 100 / computeDuration);
    }

    // Check if value is within expected range
    if (feature.metadata?.range && typeof value === 'number') {
      const [min, max] = feature.metadata.range;
      if (value < min || value > max) {
        quality *= 0.6;
      }
    }

    // Factor in feature's own reliability
    if (feature.metadata?.reliability) {
      quality *= feature.metadata.reliability;
    }

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Subscribe to feature computation results
   */
  onCompute(callback: (batch: FeatureBatch) => void): void {
    this.computeCallbacks.add(callback);
  }

  /**
   * Unsubscribe from feature computation results
   */
  offCompute(callback: (batch: FeatureBatch) => void): void {
    this.computeCallbacks.delete(callback);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const featuresByType = new Map<FeatureType, number>();
    const enabledByType = new Map<FeatureType, number>();
    
    for (const feature of this.features.values()) {
      featuresByType.set(feature.type, (featuresByType.get(feature.type) || 0) + 1);
      if (feature.enabled) {
        enabledByType.set(feature.type, (enabledByType.get(feature.type) || 0) + 1);
      }
    }

    return {
      total: this.features.size,
      enabled: Array.from(this.features.values()).filter(f => f.enabled).length,
      byType: Object.fromEntries(featuresByType),
      enabledByType: Object.fromEntries(enabledByType),
      isComputing: this.isComputing,
      queueLength: this.computeQueue.length
    };
  }
}

export const featureRegistry = FeatureRegistry.getInstance();
/**
 * DataInterpolator - Handles gaps in data collection and provides interpolated values
 */

import { createComponentLogger } from './Logger';

export interface TimestampedData {
  timestamp: number;
  [key: string]: any;
}

export interface InterpolationResult<T> {
  interpolatedData: T[];
  gapCount: number;
  maxGap: number;
  quality: number; // 0-1, lower means more interpolation
}

export class DataInterpolator {
  private static instance: DataInterpolator;
  private logger = createComponentLogger('DataInterpolator');
  private readonly maxGapMs = 30 * 1000; // 30 seconds max gap to interpolate

  private constructor() {}

  static getInstance(): DataInterpolator {
    if (!DataInterpolator.instance) {
      DataInterpolator.instance = new DataInterpolator();
    }
    return DataInterpolator.instance;
  }

  /**
   * Interpolate missing data points in a time series
   */
  interpolateTimeSeries<T extends TimestampedData>(
    data: T[], 
    expectedInterval: number = 5000 // 5 seconds default
  ): InterpolationResult<T> {
    if (data.length < 2) {
      return {
        interpolatedData: data,
        gapCount: 0,
        maxGap: 0,
        quality: 1
      };
    }

    const result: T[] = [];
    const gaps: number[] = [];
    let interpolatedCount = 0;

    // Sort by timestamp
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      result.push(current);
      
      const gap = next.timestamp - current.timestamp;
      
      // If gap is larger than expected interval, interpolate
      if (gap > expectedInterval * 1.5 && gap <= this.maxGapMs) {
        const interpolatedPoints = this.createInterpolatedPoints(current, next, expectedInterval);
        result.push(...interpolatedPoints);
        gaps.push(gap);
        interpolatedCount += interpolatedPoints.length;
        
        this.logger.debug('Interpolated gap', {
          gapMs: gap,
          pointsAdded: interpolatedPoints.length,
          fromTime: new Date(current.timestamp).toISOString(),
          toTime: new Date(next.timestamp).toISOString()
        });
      } else if (gap > this.maxGapMs) {
        gaps.push(gap);
        this.logger.warn('Gap too large to interpolate', {
          gapMs: gap,
          maxGapMs: this.maxGapMs
        });
      }
    }
    
    // Add the last point
    result.push(sorted[sorted.length - 1]);

    const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    const quality = Math.max(0, 1 - (interpolatedCount / result.length));

    return {
      interpolatedData: result,
      gapCount: gaps.length,
      maxGap,
      quality
    };
  }

  /**
   * Create interpolated points between two data points
   */
  private createInterpolatedPoints<T extends TimestampedData>(
    start: T, 
    end: T, 
    interval: number
  ): T[] {
    const interpolated: T[] = [];
    const gap = end.timestamp - start.timestamp;
    const steps = Math.floor(gap / interval);
    
    if (steps <= 1) return [];

    for (let i = 1; i < steps; i++) {
      const ratio = i / steps;
      const interpolatedTime = start.timestamp + (gap * ratio);
      
      const interpolatedPoint = this.interpolateFields(start, end, ratio);
      interpolatedPoint.timestamp = interpolatedTime;
      interpolatedPoint._interpolated = true; // Mark as interpolated
      
      interpolated.push(interpolatedPoint as T);
    }

    return interpolated;
  }

  /**
   * Interpolate individual fields between two data points
   */
  private interpolateFields<T extends TimestampedData>(start: T, end: T, ratio: number): any {
    const result: any = {};
    
    for (const key in start) {
      if (key === 'timestamp') continue;
      
      const startValue = start[key];
      const endValue = end[key];
      
      if (typeof startValue === 'number' && typeof endValue === 'number') {
        // Linear interpolation for numbers
        result[key] = startValue + (endValue - startValue) * ratio;
      } else if (Array.isArray(startValue) && Array.isArray(endValue) && 
                 startValue.length === endValue.length) {
        // Interpolate arrays element by element
        result[key] = startValue.map((start_val: any, idx: number) => {
          const end_val = endValue[idx];
          if (typeof start_val === 'number' && typeof end_val === 'number') {
            return start_val + (end_val - start_val) * ratio;
          }
          return start_val; // Non-numeric values use start value
        });
      } else {
        // For non-numeric values, use the start value
        result[key] = startValue;
      }
    }
    
    return result;
  }

  /**
   * Detect and analyze gaps in time series data
   */
  analyzeGaps<T extends TimestampedData>(
    data: T[], 
    expectedInterval: number = 5000
  ): {
    gaps: Array<{ start: number; end: number; duration: number }>;
    totalGapTime: number;
    dataCompleteness: number;
  } {
    if (data.length < 2) {
      return { gaps: [], totalGapTime: 0, dataCompleteness: 1 };
    }

    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const gaps: Array<{ start: number; end: number; duration: number }> = [];
    let totalGapTime = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gap = next.timestamp - current.timestamp;
      
      if (gap > expectedInterval * 1.5) {
        gaps.push({
          start: current.timestamp,
          end: next.timestamp,
          duration: gap
        });
        totalGapTime += gap;
      }
    }

    const totalTime = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const dataCompleteness = totalTime > 0 ? 1 - (totalGapTime / totalTime) : 1;

    return { gaps, totalGapTime, dataCompleteness };
  }

  /**
   * Fill forward missing values (use last known value)
   */
  fillForward<T extends TimestampedData>(data: T[]): T[] {
    if (data.length === 0) return data;

    const result: T[] = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      const current = { ...data[i] };
      const previous = result[result.length - 1];
      
      // Fill any null/undefined values with previous values
      for (const key in current) {
        if (key === 'timestamp') continue;
        if (current[key] == null && previous[key] != null) {
          current[key] = previous[key];
          (current as any)._filled = true;
        }
      }
      
      result.push(current);
    }

    return result;
  }
}

export const dataInterpolator = DataInterpolator.getInstance();
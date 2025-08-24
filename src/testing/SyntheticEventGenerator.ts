import { KeystrokeEvent, KeystrokeAnalyticsSummary } from '../collectors/KeystrokeCollector';
import { MouseMetrics } from '../collectors/MouseTracker';
import { VoiceFeatures } from '../collectors/VoiceAnalyzer';
import { EyeFeatures } from '../collectors/EyeTracker';
import { logger } from '../utils/Logger';

export type EventGeneratorProfile =
  | 'healthy_baseline'
  | 'parkinsons_early'
  | 'parkinsons_moderate'
  | 'alzheimers_early'
  | 'alzheimers_moderate'
  | 'ms_relapsing'
  | 'als_early'
  | 'fatigue_moderate'
  | 'stress_high'
  | 'medication_effect';

export interface GeneratorConfig {
  profile: EventGeneratorProfile;
  sessionDurationMs: number;
  eventRate: number; // events per second
  noiseLevel: number; // 0-1, amount of random variation
  progressionFactor: number; // 0-1, how far along the condition progression
  environmentFactors: {
    temperature: number; // affects tremor
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    caffeinated: boolean;
    fatigueLevel: number; // 0-1
  };
}

export interface SyntheticSession {
  profile: EventGeneratorProfile;
  startTime: number;
  endTime: number;
  totalEvents: number;
  keystrokeEvents: KeystrokeEvent[];
  mouseEvents: Array<{
    timestamp: number;
    x: number;
    y: number;
    velocity: number;
    acceleration: number;
  }>;
  voiceAnalysisResults?: VoiceFeatures;
  eyeTrackingResults?: EyeFeatures;
  groundTruthLabels: {
    anomalyScore: number; // 0-1
    riskLevel: 'low' | 'medium' | 'high';
    expectedFeatures: Record<string, number>;
    diagnosticMarkers: string[];
  };
}

export class SyntheticEventGenerator {
  private rng: () => number;
  private logger = logger;

  constructor(seed?: number) {
    this.rng = this.createSeededRNG(seed ?? Math.random());
  }

  private createSeededRNG(seed: number): () => number {
    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;

    return () => {
      state = state * 16807 % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  private gaussian(mean = 0, std = 1): number {
    const u1 = this.rng();
    const u2 = this.rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * std + mean;
  }

  private generateProfileParameters(profile: EventGeneratorProfile, progressionFactor: number) {
    const profiles = {
      healthy_baseline: {
        dwellMean: 95, dwellStd: 25,
        flightMean: 180, flightStd: 45,
        tremorAmplitude: 0.5,
        tremorFreq: 0,
        voiceJitter: 0.4,
        voiceShimmer: 3.2,
        mouseVelocity: 800,
        mouseAccuracy: 0.95,
        cognitiveLoad: 0.1
      },
      parkinsons_early: {
        dwellMean: 105 + progressionFactor * 30, dwellStd: 35 + progressionFactor * 15,
        flightMean: 195 + progressionFactor * 50, flightStd: 60 + progressionFactor * 25,
        tremorAmplitude: 1.2 + progressionFactor * 2.5,
        tremorFreq: 4.5 + progressionFactor * 1.5, // 4-6 Hz Parkinsonian tremor
        voiceJitter: 0.8 + progressionFactor * 0.6,
        voiceShimmer: 4.1 + progressionFactor * 2.3,
        mouseVelocity: 720 - progressionFactor * 150,
        mouseAccuracy: 0.92 - progressionFactor * 0.15,
        cognitiveLoad: 0.2 + progressionFactor * 0.2
      },
      parkinsons_moderate: {
        dwellMean: 140 + progressionFactor * 40, dwellStd: 55 + progressionFactor * 25,
        flightMean: 260 + progressionFactor * 80, flightStd: 90 + progressionFactor * 35,
        tremorAmplitude: 3.8 + progressionFactor * 2.2,
        tremorFreq: 5.2 + progressionFactor * 0.8,
        voiceJitter: 1.6 + progressionFactor * 1.0,
        voiceShimmer: 6.8 + progressionFactor * 3.2,
        mouseVelocity: 580 - progressionFactor * 120,
        mouseAccuracy: 0.82 - progressionFactor * 0.18,
        cognitiveLoad: 0.35 + progressionFactor * 0.25
      },
      alzheimers_early: {
        dwellMean: 108 + progressionFactor * 25, dwellStd: 38 + progressionFactor * 18,
        flightMean: 220 + progressionFactor * 60, flightStd: 75 + progressionFactor * 30,
        tremorAmplitude: 0.8 + progressionFactor * 1.2,
        tremorFreq: 2.1 + progressionFactor * 1.5, // Lower frequency intention tremor
        voiceJitter: 0.6 + progressionFactor * 0.4,
        voiceShimmer: 3.8 + progressionFactor * 1.8,
        mouseVelocity: 750 - progressionFactor * 100,
        mouseAccuracy: 0.89 - progressionFactor * 0.12,
        cognitiveLoad: 0.25 + progressionFactor * 0.35 // Higher cognitive impact
      },
      alzheimers_moderate: {
        dwellMean: 125 + progressionFactor * 45, dwellStd: 50 + progressionFactor * 25,
        flightMean: 280 + progressionFactor * 100, flightStd: 95 + progressionFactor * 40,
        tremorAmplitude: 1.5 + progressionFactor * 1.8,
        tremorFreq: 3.2 + progressionFactor * 1.3,
        voiceJitter: 1.1 + progressionFactor * 0.8,
        voiceShimmer: 5.5 + progressionFactor * 2.5,
        mouseVelocity: 620 - progressionFactor * 140,
        mouseAccuracy: 0.78 - progressionFactor * 0.20,
        cognitiveLoad: 0.5 + progressionFactor * 0.3
      },
      ms_relapsing: {
        dwellMean: 110 + progressionFactor * 35, dwellStd: 45 + progressionFactor * 30,
        flightMean: 210 + progressionFactor * 70, flightStd: 85 + progressionFactor * 35,
        tremorAmplitude: 2.2 + progressionFactor * 3.0, // Intention tremor, variable
        tremorFreq: 3.5 + progressionFactor * 2.5, // Variable frequency
        voiceJitter: 0.7 + progressionFactor * 0.5,
        voiceShimmer: 4.2 + progressionFactor * 2.0,
        mouseVelocity: 680 - progressionFactor * 180,
        mouseAccuracy: 0.85 - progressionFactor * 0.25,
        cognitiveLoad: 0.15 + progressionFactor * 0.25
      },
      als_early: {
        dwellMean: 115 + progressionFactor * 50, dwellStd: 42 + progressionFactor * 28,
        flightMean: 235 + progressionFactor * 90, flightStd: 80 + progressionFactor * 45,
        tremorAmplitude: 1.8 + progressionFactor * 2.5,
        tremorFreq: 6.2 + progressionFactor * 2.8, // Fasciculations - higher freq
        voiceJitter: 1.2 + progressionFactor * 1.5, // Voice affected early
        voiceShimmer: 6.2 + progressionFactor * 4.5,
        mouseVelocity: 650 - progressionFactor * 200,
        mouseAccuracy: 0.83 - progressionFactor * 0.30,
        cognitiveLoad: 0.1 // Usually preserved early
      },
      fatigue_moderate: {
        dwellMean: 115 + progressionFactor * 20, dwellStd: 40 + progressionFactor * 15,
        flightMean: 210 + progressionFactor * 40, flightStd: 70 + progressionFactor * 20,
        tremorAmplitude: 1.0 + progressionFactor * 1.5,
        tremorFreq: 8.2 + progressionFactor * 2.0, // Fatigue tremor - higher freq
        voiceJitter: 0.6 + progressionFactor * 0.3,
        voiceShimmer: 4.0 + progressionFactor * 1.2,
        mouseVelocity: 720 - progressionFactor * 80,
        mouseAccuracy: 0.88 - progressionFactor * 0.08,
        cognitiveLoad: 0.3 + progressionFactor * 0.2
      },
      stress_high: {
        dwellMean: 85 + progressionFactor * 15, dwellStd: 35 + progressionFactor * 20,
        flightMean: 160 + progressionFactor * 30, flightStd: 55 + progressionFactor * 25,
        tremorAmplitude: 1.8 + progressionFactor * 1.2,
        tremorFreq: 9.5 + progressionFactor * 2.5, // Stress tremor - high freq
        voiceJitter: 0.9 + progressionFactor * 0.4,
        voiceShimmer: 4.8 + progressionFactor * 1.5,
        mouseVelocity: 950 + progressionFactor * 100, // Faster, more erratic
        mouseAccuracy: 0.82 - progressionFactor * 0.10,
        cognitiveLoad: 0.4 + progressionFactor * 0.3
      },
      medication_effect: {
        dwellMean: 90 + progressionFactor * 10, dwellStd: 25 + progressionFactor * 10,
        flightMean: 175 + progressionFactor * 20, flightStd: 40 + progressionFactor * 15,
        tremorAmplitude: 0.3 + progressionFactor * 0.7, // Reduced tremor
        tremorFreq: 1.5 + progressionFactor * 1.0, // Dampened
        voiceJitter: 0.3 + progressionFactor * 0.2,
        voiceShimmer: 2.8 + progressionFactor * 1.0,
        mouseVelocity: 820 + progressionFactor * 50,
        mouseAccuracy: 0.96 + progressionFactor * 0.02,
        cognitiveLoad: 0.05 + progressionFactor * 0.1
      }
    };

    return profiles[profile];
  }

  generateKeystrokeEvents(config: GeneratorConfig): KeystrokeEvent[] {
    const params = this.generateProfileParameters(config.profile, config.progressionFactor);
    const events: KeystrokeEvent[] = [];
    const commonKeys = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Space'];

    let currentTime = 0;
    const eventInterval = 1000 / config.eventRate;
    const totalEvents = Math.floor(config.sessionDurationMs / eventInterval);

    for (let i = 0; i < totalEvents; i++) {
      const keyCode = commonKeys[Math.floor(this.rng() * commonKeys.length)];

      // Apply environmental factors
      let dwellMean = params.dwellMean;
      let flightMean = params.flightMean;

      if (config.environmentFactors.temperature > 25) {
        dwellMean *= 1.1; // Heat increases dwell time
      }
      if (config.environmentFactors.caffeinated) {
        dwellMean *= 0.95; // Caffeine reduces dwell time
        flightMean *= 0.9;
      }
      if (config.environmentFactors.timeOfDay === 'evening') {
        dwellMean *= 1.05; // Fatigue effect
      }

      dwellMean *= (1 + config.environmentFactors.fatigueLevel * 0.3);

      const dwell = Math.max(20, this.gaussian(dwellMean, params.dwellStd * (1 + config.noiseLevel)));
      const downTime = currentTime;
      const upTime = downTime + dwell;

      events.push({
        key: keyCode.replace('Key', '').toLowerCase(),
        code: keyCode,
        downTime,
        upTime,
        dwell,
        force: this.rng() * 0.8 + 0.2 // Simulate force touch if available
      });

      currentTime += this.gaussian(flightMean, params.flightStd * (1 + config.noiseLevel));
    }

    this.logger.debug('Generated keystroke events', {
      profile: config.profile,
      totalEvents: events.length,
      avgDwell: events.reduce((sum, e) => sum + (e.dwell || 0), 0) / events.length
    });

    return events;
  }

  generateMouseMetrics(config: GeneratorConfig): MouseMetrics {
    const params = this.generateProfileParameters(config.profile, config.progressionFactor);

    // Simulate mouse tracking session
    const samples = Math.floor(config.sessionDurationMs / 100); // 10Hz sampling
    const velocities: number[] = [];
    const accelerations: number[] = [];
    let tremorPower = 0;

    for (let i = 0; i < samples; i++) {
      const baseVelocity = params.mouseVelocity * (0.8 + this.rng() * 0.4);
      const tremorComponent = params.tremorAmplitude * Math.sin(2 * Math.PI * params.tremorFreq * i * 0.1) * (0.5 + this.rng() * 0.5);
      const velocity = baseVelocity + tremorComponent;

      velocities.push(velocity);

      if (i > 0) {
        accelerations.push(Math.abs(velocity - velocities[i-1]) * 10);
      }

      if (params.tremorFreq > 3 && params.tremorFreq < 7) { // Parkinsonian range
        tremorPower += tremorComponent * tremorComponent;
      }
    }

    const clickAccuracy = params.mouseAccuracy * (1 - config.noiseLevel * 0.1);

    return {
      velocityMean: velocities.reduce((a, b) => a + b, 0) / velocities.length,
      accelerationMean: accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
      tremorIndex: tremorPower / samples,
      sample: samples
    };
  }

  generateVoiceFeatures(config: GeneratorConfig): VoiceFeatures {
    const params = this.generateProfileParameters(config.profile, config.progressionFactor);

    // Generate synthetic MFCC coefficients
    const mfcc = Array.from({ length: 13 }, (_, i) => {
      const base = -15 + i * 3; // Typical MFCC range
      return this.gaussian(base, 2 + config.noiseLevel * 3);
    });

    return {
      f0: this.gaussian(150, 25),
      jitter: params.voiceJitter * (1 + config.noiseLevel * 0.5),
      shimmer: params.voiceShimmer * (1 + config.noiseLevel * 0.3),
      hnr: this.gaussian(12, 3),
      mfcc,
      energy: this.gaussian(0.3, 0.1),
      formants: [this.gaussian(700, 100), this.gaussian(1200, 150), this.gaussian(2500, 200)],
      pauseRatio: this.gaussian(0.15, 0.05),
      phonationTimeSec: this.gaussian(8.0, 2.0),
      timestamp: Date.now(),
      vot: this.gaussian(0.02, 0.01),
      speechRate: this.gaussian(4.5, 1.0),
      formantBandwidths: [this.gaussian(80, 20), this.gaussian(90, 25), this.gaussian(120, 30)],
      vocalTremor: this.gaussian(0.1, 0.05),
      pitchVariability: this.gaussian(0.15, 0.05),
      voiceQuality: Math.max(0.1, Math.min(1.0, this.gaussian(0.8, 0.15))),
      dysphoniaRisk: this.gaussian(0.2, 0.1),
      respiratoryPatterns: this.gaussian(0.75, 0.15)
    };
  }

  generateEyeFeatures(config: GeneratorConfig): EyeFeatures {
    const params = this.generateProfileParameters(config.profile, config.progressionFactor);

    // Saccade velocity affected by neurological conditions
    let saccadeVelocity = this.gaussian(400, 80); // degrees/second
    if (config.profile.includes('parkinsons')) {
      saccadeVelocity *= 0.8; // Hypometric saccades
    }
    if (config.profile.includes('alzheimers')) {
      saccadeVelocity *= 0.85; // Slower saccades
    }

    return {
      fixationStability: params.mouseAccuracy * (1 - params.tremorAmplitude * 0.1),
      saccadeRate: this.gaussian(180, 30), // saccades per minute
      blinkRate: this.gaussian(15, 4), // blinks per minute
      microsaccadeRate: this.gaussian(1.5, 0.5),
      gazeConfidence: Math.max(0.3, Math.min(1.0, this.gaussian(0.75, 0.15))),
      timestamp: Date.now()
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  generateSession(config: GeneratorConfig): SyntheticSession {
    const startTime = Date.now();
    this.logger.info('Generating synthetic session', {
      profile: config.profile,
      duration: config.sessionDurationMs,
      progression: config.progressionFactor
    });

    const keystrokeEvents = this.generateKeystrokeEvents(config);
    const mouseEvents = this.generateMouseEvents(config);
    const voiceFeatures = this.generateVoiceFeatures(config);
    const eyeFeatures = this.generateEyeFeatures(config);

    // Generate ground truth based on profile
    const groundTruth = this.generateGroundTruth(config);

    const endTime = Date.now();

    return {
      profile: config.profile,
      startTime,
      endTime,
      totalEvents: keystrokeEvents.length + mouseEvents.length,
      keystrokeEvents,
      mouseEvents,
      voiceAnalysisResults: voiceFeatures,
      eyeTrackingResults: eyeFeatures,
      groundTruthLabels: groundTruth
    };
  }

  private generateMouseEvents(config: GeneratorConfig): Array<{
    timestamp: number;
    x: number;
    y: number;
    velocity: number;
    acceleration: number;
  }> {
    const params = this.generateProfileParameters(config.profile, config.progressionFactor);
    const events = [];
    const sampleCount = Math.floor(config.sessionDurationMs / 50); // 20Hz

    let x = 500, y = 300; // Starting position
    let lastVelocity = 0;

    for (let i = 0; i < sampleCount; i++) {
      const timestamp = i * 50;

      // Add movement
      const dx = this.gaussian(0, 10) + params.tremorAmplitude * Math.sin(2 * Math.PI * params.tremorFreq * timestamp / 1000);
      const dy = this.gaussian(0, 10) + params.tremorAmplitude * Math.cos(2 * Math.PI * params.tremorFreq * timestamp / 1000);

      x += dx;
      y += dy;

      // Keep within bounds
      x = Math.max(0, Math.min(1920, x));
      y = Math.max(0, Math.min(1080, y));

      const velocity = Math.sqrt(dx * dx + dy * dy) * 20; // pixels/sec
      const acceleration = Math.abs(velocity - lastVelocity) * 20;

      events.push({
        timestamp,
        x: Math.round(x),
        y: Math.round(y),
        velocity,
        acceleration
      });

      lastVelocity = velocity;
    }

    return events;
  }

  private generateGroundTruth(config: GeneratorConfig): {
    anomalyScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    expectedFeatures: Record<string, number>;
    diagnosticMarkers: string[];
  } {
    const params = this.generateProfileParameters(config.profile, config.progressionFactor);

    // Calculate anomaly score based on profile and progression
    let anomalyScore = 0.1; // Baseline healthy

    if (config.profile !== 'healthy_baseline') {
      anomalyScore = 0.3 + config.progressionFactor * 0.6;
    }

    // Add noise and environmental factors
    anomalyScore *= (1 + config.noiseLevel * 0.2);
    anomalyScore *= (1 + config.environmentFactors.fatigueLevel * 0.15);

    anomalyScore = Math.max(0, Math.min(1, anomalyScore));

    const riskLevel: 'low' | 'medium' | 'high' =
      anomalyScore > 0.7 ? 'high' :
      anomalyScore > 0.4 ? 'medium' : 'low';

    const diagnosticMarkers: string[] = [];

    if (config.profile.includes('parkinsons')) {
      diagnosticMarkers.push('4-6Hz tremor', 'bradykinesia', 'voice changes');
    }
    if (config.profile.includes('alzheimers')) {
      diagnosticMarkers.push('cognitive load increase', 'word-finding delays');
    }
    if (config.profile.includes('ms')) {
      diagnosticMarkers.push('intention tremor', 'variable symptoms');
    }
    if (config.profile.includes('als')) {
      diagnosticMarkers.push('fasciculations', 'voice deterioration');
    }

    return {
      anomalyScore,
      riskLevel,
      expectedFeatures: {
        dwellTime: params.dwellMean,
        tremorFreq: params.tremorFreq,
        voiceJitter: params.voiceJitter,
        mouseVelocity: params.mouseVelocity
      },
      diagnosticMarkers
    };
  }
}

export function createTestingProfiles(): GeneratorConfig[] {
  const baseConfig = {
    sessionDurationMs: 30000, // 30 seconds
    eventRate: 5, // 5 events per second
    noiseLevel: 0.1,
    environmentFactors: {
      temperature: 22,
      timeOfDay: 'morning' as const,
      caffeinated: false,
      fatigueLevel: 0.1
    }
  };

  return [
    { ...baseConfig, profile: 'healthy_baseline', progressionFactor: 0 },
    { ...baseConfig, profile: 'parkinsons_early', progressionFactor: 0.3 },
    { ...baseConfig, profile: 'parkinsons_moderate', progressionFactor: 0.7 },
    { ...baseConfig, profile: 'alzheimers_early', progressionFactor: 0.2 },
    { ...baseConfig, profile: 'ms_relapsing', progressionFactor: 0.5 },
    { ...baseConfig, profile: 'fatigue_moderate', progressionFactor: 0.6 },
    { ...baseConfig, profile: 'stress_high', progressionFactor: 0.8 }
  ];
}
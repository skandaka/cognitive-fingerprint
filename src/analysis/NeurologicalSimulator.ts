// NeurologicalSimulator: Medically accurate degradation patterns for demonstration
// This is for educational and research purposes only - not for actual medical diagnosis

export interface BaselinePattern {
  keystroke: {
    meanDwell: number;
    meanFlight: number;
    varianceDwell: number;
    varianceFlight: number;
    rhythmCoefficient: number;
  };
  voice: {
    f0: number;
    jitter: number;
    shimmer: number;
    hnr: number;
    pitchVariability: number;
  };
  motor: {
    mouseVelocity: number;
    clickAccuracy: number;
    tremorAmplitude: number;
    scrollSmoothness: number;
  };
}

export interface DegradedPattern extends BaselinePattern {
  yearProgression: number;
  condition: 'parkinsons' | 'alzheimers' | 'ms' | 'als';
  confidence: number;
}

export class NeurologicalSimulator {

  /**
   * Simulate Parkinson's Disease progression
   * Based on research showing motor symptoms emerge 5-8 years before clinical diagnosis
   */
  parkinsonianDegradation(baseline: BaselinePattern, yearProgression: number): DegradedPattern {
    const progression = this.sigmoidProgression(yearProgression, 8); // 8-year progression to diagnosis
    const dailyVariation = this.gaussianNoise(0.1);
    const finalProgression = Math.min(1.0, progression + dailyVariation);

    // Keystroke degradation patterns
    const keystroke = {
      // Dwell time increases significantly (23% increase observed in studies)
      meanDwell: baseline.keystroke.meanDwell * (1 + finalProgression * 0.23),

      // Flight time becomes more variable
      meanFlight: baseline.keystroke.meanFlight * (1 + finalProgression * 0.15),

      // Variance increases due to tremor and bradykinesia
      varianceDwell: baseline.keystroke.varianceDwell * (1 + finalProgression * 0.4),
      varianceFlight: baseline.keystroke.varianceFlight * (1 + finalProgression * 0.3),

      // Rhythm becomes irregular
      rhythmCoefficient: baseline.keystroke.rhythmCoefficient * (1 + finalProgression * 0.5),
    };

    // Voice degradation patterns
    const voice = {
      // Fundamental frequency decreases
      f0: baseline.voice.f0 * (1 - finalProgression * 0.15),

      // Jitter increases (>1.04% indicates pathology)
      jitter: baseline.voice.jitter + finalProgression * 0.6,

      // Shimmer increases (>3.81% indicates pathology)
      shimmer: baseline.voice.shimmer + finalProgression * 2.0,

      // HNR decreases (voice quality deteriorates)
      hnr: baseline.voice.hnr * (1 - finalProgression * 0.2),

      // Pitch variability decreases (monotone speech)
      pitchVariability: baseline.voice.pitchVariability * (1 - finalProgression * 0.3),
    };

    // Motor control degradation
    const motor = {
      // Mouse velocity becomes more variable
      mouseVelocity: baseline.motor.mouseVelocity * (1 - finalProgression * 0.1),

      // Click accuracy decreases
      clickAccuracy: baseline.motor.clickAccuracy * (1 - finalProgression * 0.15),

      // 4-6Hz tremor emerges
      tremorAmplitude: baseline.motor.tremorAmplitude + finalProgression * 3.0,

      // Scroll smoothness deteriorates
      scrollSmoothness: baseline.motor.scrollSmoothness * (1 - finalProgression * 0.2),
    };

    return {
      keystroke,
      voice,
      motor,
      yearProgression,
      condition: 'parkinsons',
      confidence: this.calculateConfidence(finalProgression, 'parkinsons')
    };
  }

  /**
   * Simulate Multiple Sclerosis patterns
   * Characterized by relapsing-remitting episodes and heat sensitivity
   */
  multipleSclerosisPattern(baseline: BaselinePattern, yearProgression: number, relapsing: boolean = true): DegradedPattern {
    const baseProgression = this.sigmoidProgression(yearProgression, 10); // Slower progression

    // Add relapsing-remitting pattern
    let progression = baseProgression;
    if (relapsing) {
      const relapseIntensity = Math.sin(yearProgression * Math.PI * 2) * 0.3 + 0.3; // Cyclic relapses
      progression = baseProgression + relapseIntensity * (1 - baseProgression);
    }

    // Asymmetric degradation (affects one side more)
    const asymmetryFactor = 0.3 + progression * 0.4;

    const keystroke = {
      meanDwell: baseline.keystroke.meanDwell * (1 + progression * 0.18),
      meanFlight: baseline.keystroke.meanFlight * (1 + progression * 0.12),
      varianceDwell: baseline.keystroke.varianceDwell * (1 + progression * 0.35),
      varianceFlight: baseline.keystroke.varianceFlight * (1 + progression * asymmetryFactor),
      rhythmCoefficient: baseline.keystroke.rhythmCoefficient * (1 + progression * 0.4),
    };

    const voice = {
      f0: baseline.voice.f0 * (1 - progression * 0.08),
      jitter: baseline.voice.jitter + progression * 0.4,
      shimmer: baseline.voice.shimmer + progression * 1.2,
      hnr: baseline.voice.hnr * (1 - progression * 0.15),
      pitchVariability: baseline.voice.pitchVariability * (1 + progression * 0.2), // Can be variable
    };

    // Intention tremor (worsens near targets)
    const motor = {
      mouseVelocity: baseline.motor.mouseVelocity * (1 - progression * 0.08),
      clickAccuracy: baseline.motor.clickAccuracy * (1 - progression * 0.25), // Worse near targets
      tremorAmplitude: baseline.motor.tremorAmplitude + progression * 2.0, // 2-4Hz intention tremor
      scrollSmoothness: baseline.motor.scrollSmoothness * (1 - progression * 0.18),
    };

    return {
      keystroke,
      voice,
      motor,
      yearProgression,
      condition: 'ms',
      confidence: this.calculateConfidence(progression, 'ms')
    };
  }

  /**
   * Simulate Alzheimer's Disease progression
   * Characterized by cognitive decline affecting language and motor planning
   */
  alzheimerProgression(baseline: BaselinePattern, yearProgression: number): DegradedPattern {
    const progression = this.sigmoidProgression(yearProgression, 12); // Slower initial progression

    // Cognitive symptoms dominate early, motor symptoms later
    const cognitiveProgression = progression;
    const motorProgression = Math.max(0, progression - 0.3) * 1.5; // Motor symptoms lag

    const keystroke = {
      // Word-finding difficulties increase pause times
      meanDwell: baseline.keystroke.meanDwell * (1 + cognitiveProgression * 0.15),
      meanFlight: baseline.keystroke.meanFlight * (1 + cognitiveProgression * 0.4), // Long pauses
      varianceDwell: baseline.keystroke.varianceDwell * (1 + motorProgression * 0.3),
      varianceFlight: baseline.keystroke.varianceFlight * (1 + cognitiveProgression * 0.6),
      rhythmCoefficient: baseline.keystroke.rhythmCoefficient * (1 + cognitiveProgression * 0.4),
    };

    const voice = {
      f0: baseline.voice.f0 * (1 - progression * 0.1),
      jitter: baseline.voice.jitter + progression * 0.3,
      shimmer: baseline.voice.shimmer + progression * 0.8,
      hnr: baseline.voice.hnr * (1 - progression * 0.1),
      pitchVariability: baseline.voice.pitchVariability * (1 - cognitiveProgression * 0.4), // Reduced expressiveness
    };

    const motor = {
      mouseVelocity: baseline.motor.mouseVelocity * (1 - motorProgression * 0.12),
      clickAccuracy: baseline.motor.clickAccuracy * (1 - cognitiveProgression * 0.2),
      tremorAmplitude: baseline.motor.tremorAmplitude + motorProgression * 1.5,
      scrollSmoothness: baseline.motor.scrollSmoothness * (1 - motorProgression * 0.15),
    };

    return {
      keystroke,
      voice,
      motor,
      yearProgression,
      condition: 'alzheimers',
      confidence: this.calculateConfidence(progression, 'alzheimers')
    };
  }

  /**
   * Simulate ALS (Amyotrophic Lateral Sclerosis) progression
   * Characterized by progressive muscle weakness and fasciculations
   */
  alsProgression(baseline: BaselinePattern, yearProgression: number): DegradedPattern {
    const progression = this.sigmoidProgression(yearProgression, 3); // Faster progression

    // ALS can start in bulbar (speech) or limb muscles
    const bulbarOnset = Math.random() > 0.7; // 30% bulbar onset
    const bulbarProgression = bulbarOnset ? progression : progression * 0.5;
    const limbProgression = bulbarOnset ? progression * 0.5 : progression;

    const keystroke = {
      meanDwell: baseline.keystroke.meanDwell * (1 + limbProgression * 0.3),
      meanFlight: baseline.keystroke.meanFlight * (1 + limbProgression * 0.2),
      varianceDwell: baseline.keystroke.varianceDwell * (1 + limbProgression * 0.5), // Fasciculations
      varianceFlight: baseline.keystroke.varianceFlight * (1 + limbProgression * 0.4),
      rhythmCoefficient: baseline.keystroke.rhythmCoefficient * (1 + limbProgression * 0.6),
    };

    const voice = {
      f0: baseline.voice.f0 * (1 - bulbarProgression * 0.2),
      jitter: baseline.voice.jitter + bulbarProgression * 0.8,
      shimmer: baseline.voice.shimmer + bulbarProgression * 2.5,
      hnr: baseline.voice.hnr * (1 - bulbarProgression * 0.3),
      pitchVariability: baseline.voice.pitchVariability * (1 - bulbarProgression * 0.5),
    };

    const motor = {
      mouseVelocity: baseline.motor.mouseVelocity * (1 - limbProgression * 0.2),
      clickAccuracy: baseline.motor.clickAccuracy * (1 - limbProgression * 0.3),
      tremorAmplitude: baseline.motor.tremorAmplitude + limbProgression * 4.0, // Fasciculations
      scrollSmoothness: baseline.motor.scrollSmoothness * (1 - limbProgression * 0.3),
    };

    return {
      keystroke,
      voice,
      motor,
      yearProgression,
      condition: 'als',
      confidence: this.calculateConfidence(progression, 'als')
    };
  }

  /**
   * Apply realistic day-to-day variation
   */
  addDailyVariation(pattern: DegradedPattern, variationLevel: number = 0.1): DegradedPattern {
    const variation = this.gaussianNoise(variationLevel);

    const applyVariation = (value: number, factor: number = 1) => {
      return Math.max(0, value * (1 + variation * factor));
    };

    return {
      ...pattern,
      keystroke: {
        meanDwell: applyVariation(pattern.keystroke.meanDwell),
        meanFlight: applyVariation(pattern.keystroke.meanFlight),
        varianceDwell: applyVariation(pattern.keystroke.varianceDwell),
        varianceFlight: applyVariation(pattern.keystroke.varianceFlight),
        rhythmCoefficient: applyVariation(pattern.keystroke.rhythmCoefficient),
      },
      voice: {
        f0: applyVariation(pattern.voice.f0, 0.5),
        jitter: applyVariation(pattern.voice.jitter),
        shimmer: applyVariation(pattern.voice.shimmer),
        hnr: applyVariation(pattern.voice.hnr, 0.3),
        pitchVariability: applyVariation(pattern.voice.pitchVariability),
      },
      motor: {
        mouseVelocity: applyVariation(pattern.motor.mouseVelocity, 0.3),
        clickAccuracy: applyVariation(pattern.motor.clickAccuracy, 0.2),
        tremorAmplitude: applyVariation(pattern.motor.tremorAmplitude, 2.0),
        scrollSmoothness: applyVariation(pattern.motor.scrollSmoothness, 0.3),
      }
    };
  }

  /**
   * Sigmoid progression curve - slow start, rapid middle, plateau at end
   */
  private sigmoidProgression(years: number, totalYears: number): number {
    const x = (years / totalYears) * 12 - 6; // Map to -6 to 6 range
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Generate Gaussian noise for realistic variation
   */
  private gaussianNoise(stdDev: number): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z0 * stdDev;
  }

  /**
   * Calculate confidence based on progression and condition
   */
  private calculateConfidence(progression: number, condition: string): number {
    // Confidence increases with progression but varies by condition
    const baseConfidence = Math.min(0.95, progression * 1.2);

    // Adjust for condition-specific detection difficulty
    const conditionFactors = {
      'parkinsons': 0.95,  // Distinctive motor patterns
      'alzheimers': 0.80,  // More variable presentation
      'ms': 0.85,          // Relapsing-remitting complicates detection
      'als': 0.90          // Rapid progression when present
    };

    const factor = conditionFactors[condition as keyof typeof conditionFactors] || 0.8;
    return Math.max(0.1, baseConfidence * factor);
  }

  /**
   * Generate a healthy baseline pattern for comparison
   */
  generateHealthyBaseline(age: number = 45): BaselinePattern {
    // Age-adjusted baseline (performance declines slightly with age)
    const ageFactor = Math.max(0.7, 1 - (age - 25) * 0.005);

    return {
      keystroke: {
        meanDwell: 80 + (age - 25) * 0.5, // Slightly slower with age
        meanFlight: 100 + (age - 25) * 0.3,
        varianceDwell: 15 * (1 + (age - 25) * 0.01),
        varianceFlight: 20 * (1 + (age - 25) * 0.01),
        rhythmCoefficient: 0.15 + (age - 25) * 0.002,
      },
      voice: {
        f0: age > 50 ? 180 - (age - 50) * 1.5 : 200, // F0 decreases with age
        jitter: 0.3 + (age - 25) * 0.01,
        shimmer: 1.0 + (age - 25) * 0.02,
        hnr: 25 - (age - 25) * 0.05, // HNR decreases slightly with age
        pitchVariability: 8.0 - (age - 25) * 0.05,
      },
      motor: {
        mouseVelocity: 1000 * ageFactor,
        clickAccuracy: 0.95 * ageFactor,
        tremorAmplitude: 0.5 + (age - 25) * 0.01,
        scrollSmoothness: 0.9 * ageFactor,
      }
    };
  }
}
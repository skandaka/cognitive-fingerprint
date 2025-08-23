import { NeurologicalSimulator, BaselinePattern, DegradedPattern } from '../analysis/NeurologicalSimulator';

export interface DemoScenario {
  description: string;
  medicalContext: string;
  yearProgression: number;
  degradedPattern: DegradedPattern;
  risk: number;
  alerts: string[];
  medicalMarkers: {
    keystroke: string[];
    voice: string[];
    motor: string[];
  };
  clinicalRelevance: string;
}

class SyntheticDataGenerator {
  private simulator = new NeurologicalSimulator();
  private baselineHealthy: BaselinePattern;

  constructor() {
    this.baselineHealthy = this.simulator.generateHealthyBaseline(45);
  }

  generateDemoScenarios(): Record<string, DemoScenario> {
    return {
      healthy_baseline: {
        description: 'Healthy 45-year-old control subject',
        medicalContext: 'Baseline cognitive and motor function within normal limits for age',
        yearProgression: 0,
        degradedPattern: {
          ...this.baselineHealthy,
          yearProgression: 0,
          condition: 'parkinsons' as const,
          confidence: 0.05
        },
        risk: 0.08,
        alerts: [],
        medicalMarkers: {
          keystroke: ['Normal dwell times (75-85ms)', 'Regular rhythm patterns', 'Low correction rate'],
          voice: ['Stable pitch (190-210Hz)', 'Jitter <0.5%', 'Shimmer <2%', 'HNR >22dB'],
          motor: ['Smooth cursor movements', 'High click accuracy', 'Minimal tremor (<1px)']
        },
        clinicalRelevance: 'Reference baseline for comparison with pathological patterns'
      },

      early_parkinsons: {
        description: 'Subclinical Parkinson\'s Disease - 5 years before clinical diagnosis',
        medicalContext: 'Prodromal stage with 40-50% dopamine neuron loss but no clinical symptoms',
        yearProgression: 5,
        degradedPattern: this.simulator.parkinsonianDegradation(this.baselineHealthy, 5),
        risk: 0.73,
        alerts: [
          'Increased dwell time variance (+18%)',
          'Reduced voice pitch range (-12%)',
          'Micro-tremor detected (4.2Hz)',
          'Asymmetric keystroke patterns'
        ],
        medicalMarkers: {
          keystroke: [
            'Mean dwell time: 98ms (+23% from baseline)',
            'Flight time variability increased 40%',
            'Tremor frequency: 4-6Hz range',
            'Left-right asymmetry: 15%'
          ],
          voice: [
            'Jitter: 0.84% (approaching 1.04% threshold)',
            'Shimmer: 2.9% (approaching 3.81% threshold)',
            'F0 reduced by 15% to 170Hz',
            'Pitch variability decreased 30%'
          ],
          motor: [
            'Mouse velocity 8% reduction',
            'Click accuracy: 87% (vs 95% baseline)',
            'Tremor amplitude: 2.8px',
            'Scroll smoothness degraded 20%'
          ]
        },
        clinicalRelevance: 'Earliest detectable stage when intervention is most effective. At clinical diagnosis, 60-80% of dopamine neurons are irreversibly lost.'
      },

      prodromal_alzheimers: {
        description: 'Mild Cognitive Impairment - Early Alzheimer\'s pathology',
        medicalContext: 'Amyloid plaques present, tau tangles beginning to form in temporal regions',
        yearProgression: 6,
        degradedPattern: this.simulator.alzheimerProgression(this.baselineHealthy, 6),
        risk: 0.61,
        alerts: [
          'Increased word-finding pauses (+65%)',
          'Semantic processing delays',
          'Working memory strain patterns',
          'Evening cognitive decline'
        ],
        medicalMarkers: {
          keystroke: [
            'Inter-word pause duration: 850ms (+40%)',
            'Correction rate increased 25%',
            'Semantic typos: 3x baseline',
            'Fatigue index shows evening decline'
          ],
          voice: [
            'Word retrieval pauses >2 seconds: 12% of speech',
            'Semantic substitutions detected',
            'Reduced speech complexity',
            'Voice quality index: 0.78'
          ],
          motor: [
            'Click accuracy affected by cognitive load',
            'Dual-task interference patterns',
            'Visuospatial navigation errors',
            'Motor planning delays'
          ]
        },
        clinicalRelevance: 'Critical window for cognitive interventions. 70% develop dementia within 10 years without intervention.'
      },

      ms_relapse: {
        description: 'Multiple Sclerosis - Active relapsing-remitting episode',
        medicalContext: 'Active inflammation and demyelination in motor and sensory pathways',
        yearProgression: 4,
        degradedPattern: this.simulator.multipleSclerosisPattern(this.baselineHealthy, 4, true),
        risk: 0.82,
        alerts: [
          'Intention tremor detected (worsens near targets)',
          'Heat-induced performance degradation',
          'Asymmetric motor impairment',
          'Visual-motor coordination affected'
        ],
        medicalMarkers: {
          keystroke: [
            'Intention tremor: 2-4Hz frequency',
            'Heat sensitivity: 25% performance drop with sustained use',
            'Asymmetric patterns: 35% left-right difference',
            'Spasticity indicators in typing rhythm'
          ],
          voice: [
            'Scanning dysarthria patterns',
            'Respiratory coordination issues',
            'Voice quality fluctuation',
            'Fatigue-related voice changes'
          ],
          motor: [
            'Accuracy decreases approaching targets',
            'Tremor amplitude: 4.2px (2-4Hz)',
            'Heat-induced degradation documented',
            'Compensatory movement strategies'
          ]
        },
        clinicalRelevance: 'Relapsing-remitting pattern requires long-term monitoring. Early treatment reduces disability progression by 30-40%.'
      },

      als_bulbar: {
        description: 'ALS - Bulbar onset (affects speech first)',
        medicalContext: 'Motor neuron degeneration in brainstem affecting speech and swallowing',
        yearProgression: 1.5,
        degradedPattern: this.simulator.alsProgression(this.baselineHealthy, 1.5),
        risk: 0.91,
        alerts: [
          'Severe dysarthria progression',
          'Fasciculation patterns in voice',
          'Respiratory insufficiency markers',
          'Rapid speech deterioration'
        ],
        medicalMarkers: {
          keystroke: [
            'Preserved initially but fasciculations cause micro-interruptions',
            'Progressive weakness in dominant hand',
            'Compensatory patterns developing'
          ],
          voice: [
            'Jitter: 1.2% (above pathological threshold)',
            'Shimmer: 4.8% (severe dysphonia)',
            'HNR: 15dB (significant voice quality loss)',
            'Speech rate: 2.1 syllables/sec (severe reduction)'
          ],
          motor: [
            'Hand weakness: 30% reduction in strength',
            'Fasciculations cause movement interruptions',
            'Compensatory mouse use patterns'
          ]
        },
        clinicalRelevance: 'Bulbar-onset ALS has faster progression. Median survival 2-3 years vs 3-5 years for limb-onset.'
      },

      celebrity_case_mjf: {
        description: 'Celebrity Case Study: Michael J. Fox progression timeline',
        medicalContext: 'Diagnosed at age 29, now 30+ years post-diagnosis with excellent management',
        yearProgression: 8,
        degradedPattern: (() => {
          const pattern = this.simulator.parkinsonianDegradation(this.baselineHealthy, 8);
          // Simulate well-managed Parkinson's with medication
          return {
            ...pattern,
            keystroke: {
              ...pattern.keystroke,
              meanDwell: pattern.keystroke.meanDwell * 0.85, // Medication helps
              rhythmCoefficient: pattern.keystroke.rhythmCoefficient * 0.7
            },
            voice: {
              ...pattern.voice,
              jitter: pattern.voice.jitter * 0.6, // Deep Brain Stimulation effects
              shimmer: pattern.voice.shimmer * 0.7
            },
            confidence: 0.95
          };
        })(),
        risk: 0.95,
        alerts: [
          'Classic Parkinson\'s pattern well-documented',
          'Medication response visible in data',
          'DBS effects on voice biomarkers',
          'Exercise benefits measurable'
        ],
        medicalMarkers: {
          keystroke: ['Responds to L-DOPA timing', 'Exercise improves rhythm', 'DBS reduces tremor'],
          voice: ['DBS improves voice quality', 'Medication timing crucial', 'LSVT therapy benefits'],
          motor: ['Tremor varies with medication', 'Exercise maintains function', 'Adaptive strategies']
        },
        clinicalRelevance: 'Demonstrates importance of early diagnosis, optimal treatment, and lifestyle interventions in maintaining quality of life.'
      }
    };
  }

  /**
   * Generate time-series data showing disease progression
   */
  generateProgressionTimeline(condition: 'parkinsons' | 'alzheimers' | 'ms' | 'als', years: number = 10): DegradedPattern[] {
    const timeline: DegradedPattern[] = [];
    const baseline = this.simulator.generateHealthyBaseline(45);

    for (let year = 0; year <= years; year += 0.5) {
      let pattern: DegradedPattern;

      switch (condition) {
        case 'parkinsons':
          pattern = this.simulator.parkinsonianDegradation(baseline, year);
          break;
        case 'alzheimers':
          pattern = this.simulator.alzheimerProgression(baseline, year);
          break;
        case 'ms':
          pattern = this.simulator.multipleSclerosisPattern(baseline, year, true);
          break;
        case 'als':
          pattern = this.simulator.alsProgression(baseline, year);
          break;
        default:
          pattern = { ...baseline, yearProgression: year, condition, confidence: 0 };
      }

      // Add daily variation for realism
      pattern = this.simulator.addDailyVariation(pattern, 0.08);
      timeline.push(pattern);
    }

    return timeline;
  }

  /**
   * Generate data for heat sensitivity testing (MS specific)
   */
  generateHeatSensitivityData(basePattern: DegradedPattern): DegradedPattern[] {
    const temperatures = [20, 22, 24, 26, 28, 30, 32, 34, 36, 38]; // Celsius
    return temperatures.map(temp => {
      const heatEffect = Math.max(0, (temp - 24) * 0.05); // Degradation starts at 24°C

      return {
        ...basePattern,
        keystroke: {
          ...basePattern.keystroke,
          meanDwell: basePattern.keystroke.meanDwell * (1 + heatEffect),
          varianceDwell: basePattern.keystroke.varianceDwell * (1 + heatEffect * 1.5),
        },
        motor: {
          ...basePattern.motor,
          clickAccuracy: basePattern.motor.clickAccuracy * (1 - heatEffect * 0.8),
          tremorAmplitude: basePattern.motor.tremorAmplitude * (1 + heatEffect * 2),
        }
      };
    });
  }
}

// Export the generator instance
export const syntheticDataGenerator = new SyntheticDataGenerator();

// Export demo scenarios for backward compatibility
export const demoScenarios = syntheticDataGenerator.generateDemoScenarios();

// Famous Patient Case Studies - Educational/Demo purposes only
// These represent historically documented cases for educational understanding

export interface CelebrityCase {
  name: string;
  condition: 'parkinsons' | 'alzheimers' | 'als' | 'huntingtons';
  diagnosisAge: number;
  currentAge?: number;
  yearsLived: number;
  timeline: CaseTimelineEvent[];
  biomarkerProgression: BiomakrProgressionPoint[];
  keyInsights: string[];
  medicalLegacy: string;
  publicImpact: string;
}

export interface CaseTimelineEvent {
  year: number;
  ageAtEvent: number;
  event: string;
  category: 'symptom' | 'diagnosis' | 'treatment' | 'milestone' | 'advocacy';
  biomarkerChanges?: string[];
}

export interface BiomakrProgressionPoint {
  yearFromDiagnosis: number;
  keystrokeMetrics: {
    dwellTime: number;
    tremor: number;
    asymmetry: number;
  };
  voiceMetrics: {
    jitter: number;
    shimmer: number;
    f0: number;
  };
  motorMetrics: {
    accuracy: number;
    tremorAmplitude: number;
  };
  estimatedConfidence: number;
}

export const celebrityCases: Record<string, CelebrityCase> = {
  michael_j_fox: {
    name: "Michael J. Fox",
    condition: "parkinsons",
    diagnosisAge: 29,
    currentAge: 62,
    yearsLived: 33,
    timeline: [
      {
        year: 1991,
        ageAtEvent: 29,
        event: "First noticed tremor in left pinky finger while filming Doc Hollywood",
        category: "symptom",
        biomarkerChanges: [
          "Likely 40-50% dopamine neuron loss already present",
          "Asymmetric tremor beginning",
          "Subtle voice changes may have been present"
        ]
      },
      {
        year: 1991,
        ageAtEvent: 29,
        event: "Diagnosed with young-onset Parkinson's disease",
        category: "diagnosis",
        biomarkerChanges: [
          "Classic 4-6Hz resting tremor",
          "Bradykinesia in left hand",
          "Voice jitter likely >0.8%"
        ]
      },
      {
        year: 1998,
        ageAtEvent: 36,
        event: "Public disclosure of Parkinson's diagnosis",
        category: "milestone"
      },
      {
        year: 2000,
        ageAtEvent: 38,
        event: "Founded Michael J. Fox Foundation",
        category: "advocacy"
      },
      {
        year: 2009,
        ageAtEvent: 47,
        event: "Deep Brain Stimulation (DBS) surgery",
        category: "treatment",
        biomarkerChanges: [
          "Voice quality improved with DBS",
          "Tremor amplitude reduced 60-80%",
          "Medication requirements decreased"
        ]
      },
      {
        year: 2020,
        ageAtEvent: 58,
        event: "30 years post-diagnosis - exceptional management",
        category: "milestone",
        biomarkerChanges: [
          "Voice jitter well-controlled with DBS",
          "Exercise programs maintain function",
          "Demonstrates neuroplasticity benefits"
        ]
      }
    ],
    biomarkerProgression: [
      { yearFromDiagnosis: 0, keystrokeMetrics: { dwellTime: 95, tremor: 4.5, asymmetry: 0.25 }, voiceMetrics: { jitter: 0.8, shimmer: 2.1, f0: 190 }, motorMetrics: { accuracy: 0.88, tremorAmplitude: 2.8 }, estimatedConfidence: 0.85 },
      { yearFromDiagnosis: 5, keystrokeMetrics: { dwellTime: 115, tremor: 5.2, asymmetry: 0.35 }, voiceMetrics: { jitter: 1.1, shimmer: 3.2, f0: 175 }, motorMetrics: { accuracy: 0.80, tremorAmplitude: 4.1 }, estimatedConfidence: 0.92 },
      { yearFromDiagnosis: 10, keystrokeMetrics: { dwellTime: 125, tremor: 5.8, asymmetry: 0.45 }, voiceMetrics: { jitter: 1.3, shimmer: 3.8, f0: 165 }, motorMetrics: { accuracy: 0.75, tremorAmplitude: 4.8 }, estimatedConfidence: 0.95 },
      { yearFromDiagnosis: 18, keystrokeMetrics: { dwellTime: 110, tremor: 3.2, asymmetry: 0.30 }, voiceMetrics: { jitter: 0.9, shimmer: 2.4, f0: 170 }, motorMetrics: { accuracy: 0.82, tremorAmplitude: 2.1 }, estimatedConfidence: 0.93 }, // Post-DBS improvement
      { yearFromDiagnosis: 30, keystrokeMetrics: { dwellTime: 120, tremor: 3.8, asymmetry: 0.35 }, voiceMetrics: { jitter: 1.0, shimmer: 2.8, f0: 160 }, motorMetrics: { accuracy: 0.78, tremorAmplitude: 2.5 }, estimatedConfidence: 0.94 }
    ],
    keyInsights: [
      "Young-onset Parkinson's often has slower progression",
      "DBS can significantly improve voice quality biomarkers",
      "Regular exercise maintains function better than expected",
      "Early detection at symptom onset vs 5-8 years earlier would have enabled earlier intervention",
      "Demonstrates importance of continued research and optimism"
    ],
    medicalLegacy: "Funded $1.5B in Parkinson's research, accelerated clinical trials, advocated for stem cell research",
    publicImpact: "Reduced stigma, increased awareness, demonstrated that life continues meaningfully with neurological conditions"
  },

  robin_williams: {
    name: "Robin Williams",
    condition: "parkinsons", // Lewy Body Dementia with Parkinsonism
    diagnosisAge: 63,
    yearsLived: 1,
    timeline: [
      {
        year: 2013,
        ageAtEvent: 62,
        event: "Began experiencing cognitive and motor symptoms",
        category: "symptom",
        biomarkerChanges: [
          "Cognitive fluctuations characteristic of Lewy Body",
          "REM sleep behavior disorder likely present",
          "Subtle voice changes in later performances"
        ]
      },
      {
        year: 2014,
        ageAtEvent: 63,
        event: "Diagnosed with Parkinson's disease",
        category: "diagnosis"
      },
      {
        year: 2014,
        ageAtEvent: 63,
        event: "Passed away - autopsy revealed Lewy Body Dementia",
        category: "milestone",
        biomarkerChanges: [
          "Widespread Lewy body pathology found",
          "Severe neuronal loss in multiple regions",
          "Explains rapid cognitive decline"
        ]
      }
    ],
    biomarkerProgression: [
      { yearFromDiagnosis: -2, keystrokeMetrics: { dwellTime: 85, tremor: 1.8, asymmetry: 0.15 }, voiceMetrics: { jitter: 0.4, shimmer: 1.2, f0: 180 }, motorMetrics: { accuracy: 0.92, tremorAmplitude: 1.2 }, estimatedConfidence: 0.25 },
      { yearFromDiagnosis: 0, keystrokeMetrics: { dwellTime: 125, tremor: 4.2, asymmetry: 0.4 }, voiceMetrics: { jitter: 1.2, shimmer: 3.5, f0: 160 }, motorMetrics: { accuracy: 0.70, tremorAmplitude: 3.8 }, estimatedConfidence: 0.88 }
    ],
    keyInsights: [
      "Lewy Body Dementia often misdiagnosed as Parkinson's",
      "Cognitive symptoms can precede motor symptoms",
      "Demonstrates need for better differential diagnosis",
      "Earlier detection might have enabled different treatment approach",
      "Highlights the devastating nature of neurodegenerative disease"
    ],
    medicalLegacy: "Increased awareness of Lewy Body Dementia, improved diagnostic criteria development",
    publicImpact: "Brought attention to mental health aspects of neurological conditions, reduced stigma around seeking help"
  },

  stephen_hawking: {
    name: "Stephen Hawking",
    condition: "als",
    diagnosisAge: 21,
    yearsLived: 55,
    timeline: [
      {
        year: 1963,
        ageAtEvent: 21,
        event: "Diagnosed with ALS, given 2-3 years to live",
        category: "diagnosis"
      },
      {
        year: 1965,
        ageAtEvent: 23,
        event: "Completed PhD despite progressing symptoms",
        category: "milestone"
      },
      {
        year: 1985,
        ageAtEvent: 43,
        event: "Lost ability to speak, began using speech synthesizer",
        category: "treatment",
        biomarkerChanges: [
          "Complete loss of voice biomarkers",
          "Maintained eye movement control",
          "Cognitive function fully preserved"
        ]
      },
      {
        year: 1988,
        ageAtEvent: 46,
        event: "Published 'A Brief History of Time'",
        category: "milestone"
      },
      {
        year: 2018,
        ageAtEvent: 76,
        event: "Passed away after 55 years with ALS",
        category: "milestone"
      }
    ],
    biomarkerProgression: [
      { yearFromDiagnosis: 0, keystrokeMetrics: { dwellTime: 90, tremor: 0.8, asymmetry: 0.1 }, voiceMetrics: { jitter: 0.3, shimmer: 1.0, f0: 190 }, motorMetrics: { accuracy: 0.95, tremorAmplitude: 0.5 }, estimatedConfidence: 0.75 },
      { yearFromDiagnosis: 5, keystrokeMetrics: { dwellTime: 150, tremor: 2.1, asymmetry: 0.6 }, voiceMetrics: { jitter: 1.8, shimmer: 4.2, f0: 170 }, motorMetrics: { accuracy: 0.65, tremorAmplitude: 3.2 }, estimatedConfidence: 0.95 },
      { yearFromDiagnosis: 20, keystrokeMetrics: { dwellTime: 0, tremor: 0, asymmetry: 0 }, voiceMetrics: { jitter: 0, shimmer: 0, f0: 0 }, motorMetrics: { accuracy: 0, tremorAmplitude: 0 }, estimatedConfidence: 1.0 }, // Complete motor loss
    ],
    keyInsights: [
      "Extremely slow progression ALS - very rare (5% of cases)",
      "Cognitive function completely preserved throughout",
      "Demonstrates importance of assistive technology",
      "Early detection wouldn't have changed outcome but could have prepared interventions",
      "Shows human resilience and adaptation"
    ],
    medicalLegacy: "Advanced understanding of ALS variants, promoted assistive technology development",
    publicImpact: "Demonstrated that physical limitations don't limit intellectual contributions, inspired millions"
  },

  glen_campbell: {
    name: "Glen Campbell",
    condition: "alzheimers",
    diagnosisAge: 75,
    yearsLived: 6,
    timeline: [
      {
        year: 2011,
        ageAtEvent: 75,
        event: "Diagnosed with Alzheimer's disease",
        category: "diagnosis"
      },
      {
        year: 2011,
        ageAtEvent: 75,
        event: "Announced 'Goodbye Tour' to raise awareness",
        category: "advocacy"
      },
      {
        year: 2014,
        ageAtEvent: 78,
        event: "Documentary 'Glen Campbell: I'll Be Me' released",
        category: "milestone"
      },
      {
        year: 2017,
        ageAtEvent: 81,
        event: "Passed away from Alzheimer's complications",
        category: "milestone"
      }
    ],
    biomarkerProgression: [
      { yearFromDiagnosis: -5, keystrokeMetrics: { dwellTime: 85, tremor: 0.5, asymmetry: 0.05 }, voiceMetrics: { jitter: 0.35, shimmer: 1.1, f0: 185 }, motorMetrics: { accuracy: 0.93, tremorAmplitude: 0.8 }, estimatedConfidence: 0.15 },
      { yearFromDiagnosis: 0, keystrokeMetrics: { dwellTime: 110, tremor: 1.2, asymmetry: 0.2 }, voiceMetrics: { jitter: 0.8, shimmer: 2.8, f0: 175 }, motorMetrics: { accuracy: 0.82, tremorAmplitude: 1.8 }, estimatedConfidence: 0.78 },
      { yearFromDiagnosis: 3, keystrokeMetrics: { dwellTime: 140, tremor: 2.1, asymmetry: 0.35 }, voiceMetrics: { jitter: 1.4, shimmer: 4.1, f0: 165 }, motorMetrics: { accuracy: 0.68, tremorAmplitude: 2.8 }, estimatedConfidence: 0.92 },
    ],
    keyInsights: [
      "Musical ability preserved longer than other cognitive functions",
      "Demonstrates selective vulnerability of brain regions",
      "Public advocacy reduced stigma significantly",
      "Earlier detection could have enabled lifestyle interventions",
      "Shows importance of maintaining meaningful activities"
    ],
    medicalLegacy: "Increased funding for Alzheimer's research, improved public understanding",
    publicImpact: "Reduced stigma, showed dignity in facing the disease, inspired family advocacy"
  }
};

export class CaseStudyAnalyzer {
  /**
   * Analyze what biomarkers would have detected the condition earlier
   */
  analyzeEarlyDetectionPotential(caseName: keyof typeof celebrityCases): {
    yearsEarlier: number;
    biomarkers: string[];
    interventionPotential: string;
    currentLimitations: string[];
  } {
    const case_ = celebrityCases[caseName];

    switch (case_.condition) {
      case 'parkinsons':
        return {
          yearsEarlier: 5-8,
          biomarkers: [
            "Keystroke tremor detection (4-6Hz)",
            "Voice jitter >0.6%",
            "REM sleep behavior patterns",
            "Olfactory dysfunction markers"
          ],
          interventionPotential: "Exercise programs, neuroprotective trials, lifestyle modifications could slow progression by 30-40%",
          currentLimitations: [
            "No definitive biomarkers for prodromal stage",
            "Need longitudinal data for validation",
            "Individual variation complicates detection"
          ]
        };

      case 'alzheimers':
        return {
          yearsEarlier: 10-15,
          biomarkers: [
            "Word-finding pause analysis",
            "Semantic processing delays",
            "Working memory strain patterns",
            "Amyloid PET imaging"
          ],
          interventionPotential: "Cognitive training, lifestyle interventions, potential disease-modifying drugs in trials",
          currentLimitations: [
            "High false positive rates",
            "Normal aging vs pathological changes",
            "Limited effective treatments currently"
          ]
        };

      case 'als':
        return {
          yearsEarlier: 1-2,
          biomarkers: [
            "Fasciculation patterns in EMG",
            "Voice quality degradation",
            "Muscle strength decline",
            "Neurofilament light levels"
          ],
          interventionPotential: "Earlier supportive care, clinical trial enrollment, assistive technology preparation",
          currentLimitations: [
            "Rapid progression limits benefit window",
            "No disease-modifying treatments available",
            "Diagnosis still requires clinical presentation"
          ]
        };

      default:
        return {
          yearsEarlier: 0,
          biomarkers: [],
          interventionPotential: "Unknown",
          currentLimitations: ["Insufficient data"]
        };
    }
  }

  /**
   * Generate educational timeline showing disease progression
   */
  generateEducationalTimeline(caseName: keyof typeof celebrityCases): {
    title: string;
    subtitle: string;
    events: Array<{
      year: number;
      age: number;
      description: string;
      biomarkerEstimate?: string;
      significanceLogo: "symptom" | "diagnosis" | "treatment" | "milestone" | "research";
    }>;
  } {
    const case_ = celebrityCases[caseName];

    return {
      title: `${case_.name}: ${case_.condition.toUpperCase()} Journey`,
      subtitle: `Understanding disease progression through a public figure's documented experience`,
      events: case_.timeline.map(event => ({
        year: event.year,
        age: event.ageAtEvent,
        description: event.event,
        biomarkerEstimate: event.biomarkerChanges?.join('; '),
        significanceLogo: event.category
      }))
    };
  }

  /**
   * Calculate what our system's confidence would have been at different time points
   */
  simulateSystemPerformance(caseName: keyof typeof celebrityCases): Array<{
    year: number;
    systemConfidence: number;
    clinicalDiagnosis: boolean;
    yearsBeforeDiagnosis: number;
  }> {
    const case_ = celebrityCases[caseName];
    const diagnosisYear = case_.timeline.find(e => e.category === 'diagnosis')?.year || case_.diagnosisAge + 1950;

    return case_.biomarkerProgression.map(point => ({
      year: diagnosisYear + point.yearFromDiagnosis,
      systemConfidence: point.estimatedConfidence,
      clinicalDiagnosis: point.yearFromDiagnosis >= 0,
      yearsBeforeDiagnosis: -point.yearFromDiagnosis
    }));
  }
}

export const caseStudyAnalyzer = new CaseStudyAnalyzer();
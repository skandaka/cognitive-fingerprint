'use client';

import React, { useState } from 'react';
import { NeurologicalSimulator, BaselinePattern } from '../analysis/NeurologicalSimulator';
import { syntheticDataGenerator } from './SyntheticData';
import { celebrityCases, caseStudyAnalyzer } from './CaseStudies';

type Condition = 'parkinsons' | 'alzheimers' | 'ms' | 'als';
type ViewMode = 'progression' | 'comparison' | 'celebrity';

interface TimelineEvent {
  year: number;
  event: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  biomarkerChanges: string[];
}

export const TimeMachine = () => {
  const [years, setYears] = useState(0);
  const [condition, setCondition] = useState<Condition>('parkinsons');
  const [viewMode, setViewMode] = useState<ViewMode>('progression');
  const [selectedCelebrity, setSelectedCelebrity] = useState('michael_j_fox');
  const [showProjection, setShowProjection] = useState(false);

  // Use simple memoization approach
  const simulator = new NeurologicalSimulator();
  const baseline = simulator.generateHealthyBaseline(45);

  // Generate degraded pattern based on current settings
  const degradedPattern = (() => {
    switch (condition) {
      case 'parkinsons':
        return simulator.parkinsonianDegradation(baseline, years);
      case 'alzheimers':
        return simulator.alzheimerProgression(baseline, years);
      case 'ms':
        return simulator.multipleSclerosisPattern(baseline, years, true);
      case 'als':
        return simulator.alsProgression(baseline, years);
      default:
        return simulator.parkinsonianDegradation(baseline, years);
    }
  })();

  // Generate timeline events for current progression
  const timelineEvents = (() => {
    const events: TimelineEvent[] = [];

    // Add events based on condition and progression
    const eventMap = {
      parkinsons: [
        { year: 0, event: 'Subclinical changes begin', severity: 'normal' as const, biomarkerChanges: ['50% dopamine neurons still healthy'] },
        { year: 2, event: 'Subtle motor changes', severity: 'mild' as const, biomarkerChanges: ['Tremor amplitude: 1.5px', 'Dwell time +8%'] },
        { year: 5, event: 'Detectable biomarkers', severity: 'moderate' as const, biomarkerChanges: ['4-6Hz tremor clear', 'Voice jitter >0.8%'] },
        { year: 8, event: 'Clinical diagnosis typical', severity: 'severe' as const, biomarkerChanges: ['60-80% dopamine loss', 'All biomarkers pathological'] }
      ],
      alzheimers: [
        { year: 0, event: 'Amyloid plaques forming', severity: 'normal' as const, biomarkerChanges: ['Cognitive reserve protecting'] },
        { year: 3, event: 'Subtle cognitive changes', severity: 'mild' as const, biomarkerChanges: ['Word-finding delays +20%'] },
        { year: 6, event: 'MCI symptoms appear', severity: 'moderate' as const, biomarkerChanges: ['Semantic errors detectable'] },
        { year: 10, event: 'Dementia diagnosis', severity: 'severe' as const, biomarkerChanges: ['Widespread cortical damage'] }
      ],
      ms: [
        { year: 0, event: 'Initial inflammation', severity: 'normal' as const, biomarkerChanges: ['Subclinical lesions'] },
        { year: 1, event: 'First relapse', severity: 'moderate' as const, biomarkerChanges: ['Intention tremor', 'Heat sensitivity'] },
        { year: 3, event: 'Relapsing-remitting pattern', severity: 'mild' as const, biomarkerChanges: ['Variable symptoms'] },
        { year: 8, event: 'Progressive phase possible', severity: 'severe' as const, biomarkerChanges: ['Sustained disability'] }
      ],
      als: [
        { year: 0, event: 'Motor neurons affected', severity: 'mild' as const, biomarkerChanges: ['Fasciculations begin'] },
        { year: 0.5, event: 'Weakness appears', severity: 'moderate' as const, biomarkerChanges: ['Muscle strength -20%'] },
        { year: 1, event: 'Diagnosis typical', severity: 'severe' as const, biomarkerChanges: ['Multiple regions affected'] },
        { year: 2, event: 'Advanced symptoms', severity: 'severe' as const, biomarkerChanges: ['Respiratory involvement'] }
      ]
    };

    return eventMap[condition].filter(event => event.year <= years);
  })();

  // Get celebrity case data if in celebrity mode
  const celebrityData = (() => {
    if (viewMode !== 'celebrity') return null;
    return caseStudyAnalyzer.simulateSystemPerformance(selectedCelebrity as keyof typeof celebrityCases);
  })();

  const formatBiomarkerValue = (baseline: number, current: number, unit: string = '', isInverse: boolean = false) => {
    const change = isInverse ? ((baseline - current) / baseline) * 100 : ((current - baseline) / baseline) * 100;
    const changeStr = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
    return `${baseline.toFixed(1)} → ${current.toFixed(1)}${unit} (${changeStr})`;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      normal: 'bg-green-500',
      mild: 'bg-yellow-500',
      moderate: 'bg-orange-500',
      severe: 'bg-red-500'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-500';
  };

  const getConditionInfo = (condition: Condition) => {
    const info = {
      parkinsons: {
        fullName: "Parkinson's Disease",
        description: "Progressive neurodegenerative disorder affecting movement",
        progression: "Slow to moderate (8-12 years to clinical diagnosis)",
        keyBiomarkers: "4-6Hz tremor, voice jitter >1.04%, dwell time increase"
      },
      alzheimers: {
        fullName: "Alzheimer's Disease",
        description: "Progressive cognitive decline and memory loss",
        progression: "Very slow initially (10-20 years preclinical)",
        keyBiomarkers: "Word-finding delays, semantic errors, working memory strain"
      },
      ms: {
        fullName: "Multiple Sclerosis",
        description: "Autoimmune disorder affecting the central nervous system",
        progression: "Variable (relapsing-remitting pattern)",
        keyBiomarkers: "Intention tremor, heat sensitivity, asymmetric patterns"
      },
      als: {
        fullName: "Amyotrophic Lateral Sclerosis",
        description: "Progressive motor neuron disease",
        progression: "Rapid (2-4 years typical survival)",
        keyBiomarkers: "Fasciculations, voice quality loss, progressive weakness"
      }
    };
    return info[condition];
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-400">⏰ Time Machine</h2>
        <div className="text-sm text-gray-400">
          Medically Accurate Disease Progression Simulation
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">View Mode</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
          >
            <option value="progression">Disease Progression</option>
            <option value="comparison">Side-by-Side Comparison</option>
            <option value="celebrity">Celebrity Case Studies</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {viewMode === 'celebrity' ? 'Celebrity Case' : 'Condition'}
          </label>
          {viewMode === 'celebrity' ? (
            <select
              value={selectedCelebrity}
              onChange={(e) => setSelectedCelebrity(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
            >
              <option value="michael_j_fox">Michael J. Fox</option>
              <option value="robin_williams">Robin Williams</option>
              <option value="stephen_hawking">Stephen Hawking</option>
              <option value="glen_campbell">Glen Campbell</option>
            </select>
          ) : (
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
            >
              <option value="parkinsons">Parkinson&apos;s Disease</option>
              <option value="alzheimers">Alzheimer&apos;s Disease</option>
              <option value="ms">Multiple Sclerosis</option>
              <option value="als">ALS</option>
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Years from Onset: {years.toFixed(1)}
          </label>
          <input
            type="range"
            min={0}
            max={viewMode === 'celebrity' ? 20 : 10}
            step={0.1}
            value={years}
            onChange={(e) => setYears(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Condition Information */}
      {viewMode !== 'celebrity' && (
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-blue-300">{getConditionInfo(condition).fullName}</h3>
              <p className="text-sm text-gray-300 mt-1">{getConditionInfo(condition).description}</p>
            </div>
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-400">Progression:</span> {getConditionInfo(condition).progression}</div>
              <div><span className="text-gray-400">Key Biomarkers:</span> {getConditionInfo(condition).keyBiomarkers}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'progression' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Biomarker Changes */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-400 mb-4">📊 Biomarker Changes</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400">Keystroke Dwell Time</div>
                <div className="font-mono">
                  {formatBiomarkerValue(baseline.keystroke.meanDwell, degradedPattern.keystroke.meanDwell, 'ms')}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Voice Jitter</div>
                <div className="font-mono">
                  {formatBiomarkerValue(baseline.voice.jitter, degradedPattern.voice.jitter, '%')}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Tremor Amplitude</div>
                <div className="font-mono">
                  {formatBiomarkerValue(baseline.motor.tremorAmplitude, degradedPattern.motor.tremorAmplitude, 'px')}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Mouse Accuracy</div>
                <div className="font-mono">
                  {formatBiomarkerValue(baseline.motor.clickAccuracy, degradedPattern.motor.clickAccuracy, '', true)}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-purple-400 mb-4">📅 Disease Timeline</h3>
            <div className="space-y-3">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(event.severity)} mt-1 flex-shrink-0`}></div>
                  <div>
                    <div className="text-sm font-medium">Year {event.year}: {event.event}</div>
                    <div className="text-xs text-gray-400">
                      {event.biomarkerChanges.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="bg-gradient-to-r from-red-900/20 to-green-900/20 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">🎯 Risk Assessment</h3>
          <div className="text-lg font-bold">
            {(degradedPattern.confidence * 100).toFixed(1)}% Confidence
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${degradedPattern.confidence * 100}%`,
              background: degradedPattern.confidence > 0.7 ? '#ef4444' :
                         degradedPattern.confidence > 0.4 ? '#f59e0b' : '#10b981'
            }}
          ></div>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          {years === 0 ? 'Healthy baseline - no pathological indicators' :
           degradedPattern.confidence > 0.7 ? 'High risk - clinical evaluation recommended' :
           degradedPattern.confidence > 0.4 ? 'Moderate risk - continued monitoring advised' :
           'Low risk - within normal variation'}
        </div>
      </div>

      {/* Future Projection Toggle */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="projection"
          checked={showProjection}
          onChange={(e) => setShowProjection(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="projection" className="text-sm">
          Show 10-year progression projection
        </label>
      </div>

      {showProjection && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-400 mb-2">🔮 Projection (Years {years} → {years + 10})</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Expected Changes</div>
              <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                <li>Biomarker deterioration continues</li>
                <li>Clinical symptoms may emerge</li>
                <li>Intervention effectiveness decreases</li>
              </ul>
            </div>
            <div>
              <div className="text-gray-400">Intervention Window</div>
              <div className="text-xs mt-1">
                {years < 3 ? '🟢 Optimal intervention period' :
                 years < 6 ? '🟡 Good intervention potential' :
                 '🔴 Limited intervention benefit'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Research Impact</div>
              <div className="text-xs mt-1">
                Early detection enables participation in clinical trials and preventive strategies
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded border-l-4 border-yellow-500">
        <div className="font-semibold text-yellow-400 mb-1">⚠️ Medical Disclaimer</div>
        This simulation is for educational and research purposes only. It represents synthetic data based on published medical literature and does not constitute medical diagnosis, treatment, or clinical prediction. Consult healthcare professionals for medical evaluation and decision-making.
      </div>
    </div>
  );
};

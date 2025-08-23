'use client';

import React from 'react';
import { CognitiveProvider, useCognitive } from '../state/GlobalState';
import { RiskGauge } from './RiskGauge';
import { WaveformDisplay } from './WaveformDisplay';
import { ProgressionTimeline } from './ProgressionTimeline';
import dynamic from 'next/dynamic';
import { shapGroupAttribution, permutationFeatureAttribution } from '../analysis/Attribution';
import { CognitiveFingerprintModel } from '../analysis/PatternRecognition';
import { TimeMachine } from '../demo/TimeMachine';
import { ReportExporter } from '../components/ReportExporter';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AlertCenter } from '../components/AlertCenter';
import { BaselineWizard } from '../components/BaselineWizard';
import { PrivacySettings } from '../components/PrivacySettings';
import { DPStatusBadge } from '../components/DPStatusBadge';
// Dynamically load components that rely on browser-only APIs / randomness to prevent SSR hydration mismatches.
const BrainHeatmap = dynamic(()=> import('./BrainHeatmap').then(m=> m.BrainHeatmap), { ssr:false });
const PerfOverlay = dynamic(()=> import('../components/PerfOverlay').then(m=> m.PerfOverlay), { ssr:false });

function InnerDashboard(){
  const { keystroke, mouse, voice, risk, confidence, eye, exportData, wipeData, baselineHash } = useCognitive();
  // Derive dynamic group attributions when core modalities present
  let attributions: { group: string; contribution: number; }[] | undefined;
  let featureAtts: { feature:string; contribution:number; group:string; }[] | undefined;
  if (keystroke && mouse && voice) {
    const model = new CognitiveFingerprintModel();
    const features = {
      typing: [keystroke.meanDwell/200, keystroke.meanFlight/300, keystroke.varianceDwell/1000, keystroke.entropy/4, ...new Array(43).fill(0.05)],
      voice: voice? [voice.f0/300, voice.jitter/5, voice.shimmer/10, voice.hnr/40, ...voice.mfcc.slice(0,9).map(v=>v/50)]: new Array(13).fill(0.05),
      motor: mouse? [mouse.velocityMean/1000, mouse.accelerationMean/5000, (mouse.tremorIndex||0)/500, ...new Array(20).fill(0.05)]: new Array(23).fill(0.05),
      temporal: new Array(12).fill(0.05)
    };
    attributions = shapGroupAttribution(model, features as any, 24);
    featureAtts = permutationFeatureAttribution(model, features as any, 0.5);
  }
  const hasAnyData = keystroke || mouse || voice || eye;
  
  return (
    <div className="p-6 space-y-6" role="main" aria-label="Cognitive Fingerprint Dashboard">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Cognitive Fingerprint Dashboard</h1>
        <DPStatusBadge />
      </div>
      
      {!hasAnyData && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 text-xl">💡</div>
            <div>
              <div className="font-semibold text-blue-300 mb-2">Get Started - Interact to Generate Your Cognitive Fingerprint</div>
              <ul className="space-y-1 text-gray-300">
                <li>• <strong>Type anywhere</strong> on this page (just 5+ keystrokes) to see your keystroke dynamics</li>
                <li>• <strong>Move your mouse</strong> around to generate motor pattern data</li>
                <li>• <strong>Allow microphone access</strong> to analyze voice biomarkers (optional)</li>
                <li>• <strong>Explore the Time Machine</strong> below for disease progression simulation</li>
              </ul>
              <div className="text-xs text-blue-400 mt-2">
                All data is processed locally - nothing leaves your device.
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6 space-y-6">
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">Real-time Typing Rhythm</h2>
            <WaveformDisplay />
          </div>
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg text-xs grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-1 text-gray-300">Keystroke Metrics</h3>
              {keystroke? (
                <ul className="space-y-0.5">
                  <li>Dwell μ: {keystroke.meanDwell.toFixed(1)} ms</li>
                  <li>Flight μ: {keystroke.meanFlight.toFixed(1)} ms</li>
                  <li>Dwell σ²: {keystroke.varianceDwell.toFixed(1)}</li>
                  <li>Entropy: {keystroke.entropy.toFixed(2)}</li>
                  <li>Samples: {keystroke.sample}</li>
                </ul>
              ): <div className="text-gray-500">Collecting...</div>}
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-gray-300">Mouse Metrics</h3>
              {mouse? (
                <ul className="space-y-0.5">
                  <li>Velocity μ: {mouse.velocityMean.toFixed(1)}</li>
                  <li>Accel μ: {mouse.accelerationMean.toFixed(1)}</li>
                  <li>Tremor idx: {mouse.tremorIndex?.toFixed(2)}</li>
                  <li>Samples: {mouse.sample}</li>
                </ul>
              ): <div className="text-gray-500">Tracking...</div>}
            </div>
          </div>
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">Progression Timeline</h2>
            <ProgressionTimeline />
          </div>
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">Time Machine (Synthetic Progression)</h2>
            <TimeMachine />
          </div>
      <div className="bg-neuro-surface rounded-xl p-4 shadow-lg text-xs">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">Oculomotor (Eye) Metrics</h2>
            {eye? (
              <ul className="space-y-0.5">
                <li>Fixation Stability: {eye.fixationStability.toFixed(2)}</li>
                <li>Saccade Rate: {eye.saccadeRate.toFixed(0)}/min</li>
                <li>Blink Rate: {eye.blinkRate.toFixed(0)}/min</li>
        {eye.microsaccadeRate !== null && <li>Microsacc: {eye.microsaccadeRate.toFixed(0)}/min</li>}
        {eye.gazeConfidence !== null && <li>Gaze Conf: {(eye.gazeConfidence*100).toFixed(0)}%</li>}
              </ul>
            ): <div className="text-gray-500">Estimating (proxy)</div>}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6 space-y-6">
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">3D Brain Biomarker Heatmap</h2>
            <div className="h-72"><BrainHeatmap /></div>
          </div>
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">Risk Assessment</h2>
            <RiskGauge risk={risk ?? 0.12} confidence={confidence ?? 0.85} />
            {voice && (
              <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] leading-tight">
                <div>F0: {voice.f0.toFixed(1)} Hz</div>
                <div>Jitt: {voice.jitter.toFixed(2)}%</div>
                <div>Shim: {voice.shimmer.toFixed(2)}%</div>
                <div>HNR: {voice.hnr.toFixed(1)} dB</div>
                <div className="col-span-2">Formants: {voice.formants.map(f=>f? f.toFixed(0):'-').join('/')}</div>
                <div>Pause: {(voice.pauseRatio*100).toFixed(0)}%</div>
                <div>Phonation: {voice.phonationTimeSec.toFixed(1)}s</div>
              </div>
            )}
            <div className="mt-4 flex gap-2 text-xs">
              <button onClick={()=>{ const blob = new Blob([exportData? exportData():'' ], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cognitive_export.json'; a.click(); }} className="px-3 py-1 rounded bg-neuro-accent/20 hover:bg-neuro-accent/30">Export Data</button>
              <button onClick={()=> wipeData && wipeData()} className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30">Wipe Local</button>
            </div>
            {baselineHash && <div className="mt-2 text-[10px] break-all text-gray-500" aria-label="Baseline fingerprint hash">Baseline Hash: {baselineHash.slice(0,32)}…</div>}
            <div className="mt-4"><ReportExporter /></div>
            <div className="mt-4"><Disclaimer /></div>
          </div>
          <div className="bg-neuro-surface rounded-xl p-4 shadow-lg text-xs">
            <h2 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-400">Model Performance (Demo)</h2>
            <div className="flex items-end gap-4">
              <svg width="140" height="100" aria-label="ROC Curve"><polyline fill="none" stroke="#60a5fa" strokeWidth="2" points="0,100 20,70 40,50 60,35 80,22 100,12 120,5 140,0" /><line x1="0" y1="100" x2="140" y2="0" stroke="#374151" strokeDasharray="4 4" /></svg>
              <ul className="space-y-1">
                <li>AUC: 0.96</li>
                <li>Sensitivity: 94%</li>
                <li>Specificity: 91%</li>
                <li>PPV: 89%</li>
                <li>NPV: 95%</li>
              </ul>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-300 mb-1">Group Attributions (SHAP-style demo)</h3>
                {attributions? (
                  <ol className="list-decimal ml-5 space-y-0.5">
                    {attributions.map(a => <li key={a.group}>{a.group}: {(a.contribution*100).toFixed(1)}%</li>)}
                  </ol>
                ): <div className="text-gray-500 text-xs">Collecting signals...</div>}
              </div>
              <details className="bg-black/20 rounded p-2">
                <summary className="cursor-pointer text-xs font-semibold">Per-Feature Attribution (top 25)</summary>
                {featureAtts? (
                  <ul className="mt-2 space-y-0.5 text-[11px] max-h-48 overflow-auto pr-1">
                    {featureAtts.map(f => <li key={f.feature}>{f.feature}: {(f.contribution*100).toFixed(1)}%</li>)}
                  </ul>
                ): <div className="text-gray-500 text-[11px] mt-2">Waiting for signals...</div>}
              </details>
            </div>
          </div>
          <AlertCenter />
          <PrivacySettings />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard(){
  return <CognitiveProvider><ErrorBoundary><InnerDashboard/><BaselineWizard /><PerfOverlay /></ErrorBoundary></CognitiveProvider>;
}

'use client';

import React from 'react';
import { CognitiveProvider, useCognitive } from '../state/GlobalState';
import { RiskGauge } from './RiskGauge';
import { WaveformDisplay } from './WaveformDisplay';
import { ProgressionTimeline } from './ProgressionTimeline';
import dynamic from 'next/dynamic';
import { ReportExporter } from '../components/ReportExporter';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AlertCenter } from '../components/AlertCenter';
import { BaselineWizard } from '../components/BaselineWizard';
import { PrivacySettings } from '../components/PrivacySettings';
import { DPStatusBadge } from '../components/DPStatusBadge';
import { backgroundProcessor } from '../utils/BackgroundProcessor';
import { BackgroundDebugPanel } from '../components/BackgroundDebugPanel';
// Dynamically load components that rely on browser-only APIs / randomness to prevent SSR hydration mismatches.
const PerfOverlay = dynamic(()=> import('../components/PerfOverlay').then(m=> m.PerfOverlay), { ssr:false });

function InnerDashboard(){
  const { keystroke, mouse, voice, risk, confidence, eye, exportData, wipeData } = useCognitive();
  const hasAnyData = keystroke || mouse || voice || eye;
  const [backgroundStats, setBackgroundStats] = React.useState(backgroundProcessor.getStats());

  // Update background stats periodically
  React.useEffect(() => {
    const updateStats = () => setBackgroundStats(backgroundProcessor.getStats());
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6" role="main" aria-label="Cognitive Fingerprint Dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-cyan-400 text-2xl">🧠</div>
          <h1 className="text-2xl font-semibold text-white">Cognitive Fingerprint</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-400">
            Status: <span className={`font-medium ${hasAnyData ? 'text-green-400' : 'text-yellow-400'}`}>
              {hasAnyData ? '● MONITORING' : '○ CALIBRATING'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Background: <span className={`font-medium ${backgroundStats.activeTaskCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {backgroundStats.activeTaskCount > 0 ? `● ${backgroundStats.activeTaskCount} tasks` : '○ INACTIVE'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Tab: <span className={`font-medium ${backgroundStats.isVisible ? 'text-green-400' : 'text-blue-400'}`}>
              {backgroundStats.isVisible ? '● ACTIVE' : '● BACKGROUND'}
            </span>
          </div>
          <DPStatusBadge />
        </div>
      </div>


      {/* Hero Metrics - Current State */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Cognitive Health */}
        <div className="bg-neuro-surface rounded-xl p-6 text-center">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Cognitive Health</h2>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {risk ? (100 - risk * 100).toFixed(0) : 'N/A'}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400" 
              style={{ width: `${risk ? 100 - risk * 100 : 50}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">Optimal Range</div>
        </div>

        {/* Detection Confidence */}
        <div className="bg-neuro-surface rounded-xl p-6 text-center">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Detection Confidence</h2>
          <div className="text-3xl font-bold text-cyan-400 mb-2">
            {confidence ? (confidence * 100).toFixed(0) : 'N/A'}%
          </div>
          <div className="flex justify-center mb-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full mx-0.5 ${
                  i < (confidence ? Math.floor(confidence * 10) : 0) ? 'bg-cyan-400' : 'bg-gray-600'
                }`} 
              />
            ))}
          </div>
          <div className="text-xs text-gray-400">
            {confidence && confidence > 0.7 ? 'High Confidence' : confidence && confidence > 0.5 ? 'Moderate' : 'Building baseline...'}
          </div>
        </div>

        {/* Days Monitored */}
        <div className="bg-neuro-surface rounded-xl p-6 text-center">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Session Active</h2>
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {keystroke?.sample || 0}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" 
              style={{ width: `${Math.min(100, ((keystroke?.sample || 0) / 100) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">Keystrokes captured</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Real-time Waveform */}
          <div className="bg-neuro-surface rounded-xl p-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Live Typing Rhythm</h2>
            <WaveformDisplay />
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-400">Dwell Time</div>
                <div className="font-mono text-cyan-400">{keystroke?.meanDwell.toFixed(1) || '--'} ms</div>
              </div>
              <div>
                <div className="text-gray-400">Flight Time</div>
                <div className="font-mono text-cyan-400">{keystroke?.meanFlight.toFixed(1) || '--'} ms</div>
              </div>
            </div>
          </div>

          {/* Progression Timeline */}
          <div className="bg-neuro-surface rounded-xl p-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Risk Progression</h2>
            <ProgressionTimeline />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Risk Gauge */}
          <div className="bg-neuro-surface rounded-xl p-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Risk Assessment</h2>
            <RiskGauge risk={risk ?? 0.12} confidence={confidence ?? 0.85} />
          </div>

          {/* Voice Biomarkers - Only show if available */}
          {voice && (
            <div className="bg-neuro-surface rounded-xl p-6">
              <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Voice Biomarkers</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400">Fundamental Frequency</div>
                  <div className="font-mono text-green-400">{voice.f0.toFixed(1)} Hz</div>
                </div>
                <div>
                  <div className="text-gray-400">Voice Jitter</div>
                  <div className="font-mono text-green-400">{voice.jitter.toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-gray-400">Shimmer</div>
                  <div className="font-mono text-green-400">{voice.shimmer.toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-gray-400">HNR</div>
                  <div className="font-mono text-green-400">{voice.hnr.toFixed(1)} dB</div>
                </div>
              </div>
            </div>
          )}

          {/* Motor Control - Only show if mouse data available */}
          {mouse && (
            <div className="bg-neuro-surface rounded-xl p-6">
              <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Motor Control</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400">Velocity</div>
                  <div className="font-mono text-blue-400">{mouse.velocityMean.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Tremor Index</div>
                  <div className="font-mono text-blue-400">{mouse.tremorIndex?.toFixed(3) || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-neuro-surface rounded-xl p-6">
            <div className="flex gap-3 mb-4">
              <button 
                onClick={()=>{ 
                  const blob = new Blob([exportData? exportData():'' ], {type:'application/json'}); 
                  const a=document.createElement('a'); 
                  a.href=URL.createObjectURL(blob); 
                  a.download='cognitive_export.json'; 
                  a.click(); 
                }} 
                className="px-4 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-medium"
              >
                Export Data
              </button>
              <button 
                onClick={()=> wipeData && wipeData()} 
                className="px-4 py-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium"
              >
                Reset
              </button>
            </div>
            <ReportExporter />
            <div className="mt-4"><Disclaimer /></div>
          </div>
        </div>
      </div>

      {/* Alerts and Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertCenter />
        <PrivacySettings />
      </div>

      {/* Empty State */}
      {!hasAnyData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-neuro-surface rounded-xl p-8 max-w-md text-center">
            <div className="text-cyan-400 text-4xl mb-4">🧠</div>
            <h2 className="text-xl font-semibold mb-4">Start Monitoring</h2>
            <p className="text-gray-300 text-sm mb-6">
              Begin typing anywhere on your screen to start capturing your cognitive fingerprint. 
              All analysis happens locally on your device.
            </p>
            <div className="text-xs text-gray-400">
              Simply type, move your mouse, or speak to begin
            </div>
          </div>
        </div>
      )}
      
      <BackgroundDebugPanel />
    </div>
  );
}

export default function Dashboard(){
  return <CognitiveProvider><ErrorBoundary><InnerDashboard/><BaselineWizard /><PerfOverlay /></ErrorBoundary></CognitiveProvider>;
}

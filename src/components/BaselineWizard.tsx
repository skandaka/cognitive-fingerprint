'use client';

import React, { useEffect, useState } from 'react';
import { useCognitive } from '../state/GlobalState';

export const BaselineWizard = () => {
  const { baselineKeystroke, keystroke, setBaselineKeystroke } = useCognitive();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const targetSamples = 50; // accelerated demo baseline for testing

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(()=>{
    if (baselineKeystroke) return;
    const sampleCount = keystroke?.sample || 0;
    setProgress(Math.min(1, sampleCount / targetSamples));
    if (sampleCount >= targetSamples && step < 3) setStep(3);
  }, [keystroke?.sample, baselineKeystroke, targetSamples, step]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || baselineKeystroke) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-lg bg-neuro-surface p-6 rounded-xl space-y-5 shadow-2xl border border-white/10">
        <h1 className="text-xl font-semibold tracking-tight">Baseline Calibration</h1>
        {step===0 && (
          <div className="space-y-4 text-sm leading-relaxed">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <h3 className="font-semibold text-blue-300 mb-2">📋 Calibration Process</h3>
              <ul className="space-y-1 text-gray-300 text-xs">
                <li>• We establish your unique typing and motor patterns</li>
                <li>• All processing happens locally on your device</li>
                <li>• Takes ~30 seconds (50 keystrokes for demo)</li>
                <li>• No special typing test - just type normally!</li>
              </ul>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <h4 className="font-semibold text-yellow-300 mb-2">💡 What to do:</h4>
              <p className="text-gray-300 text-xs">
                After clicking &quot;Begin&quot;, simply type anywhere in your browser - in this page, in text fields,
                or even in other tabs. The system captures your natural typing rhythm in the background.
                You can continue your normal work while calibration runs.
              </p>
            </div>
            <button onClick={()=>setStep(1)} className="px-4 py-2 rounded bg-neuro-accent text-black text-sm font-medium">Begin Calibration</button>
          </div>
        )}
        {step===1 && (
          <div className="space-y-4 text-sm">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-300 text-sm font-semibold mb-2">🎯 Calibration Active</p>
              <p className="text-gray-300 text-xs">
                Start typing anywhere (in this window, text fields, or other browser tabs).
                The system is listening and will capture your natural patterns automatically.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span className="font-mono">{keystroke?.sample||0} / {targetSamples} keystrokes</span>
              </div>
              <div className="h-3 rounded bg-black/30 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-neuro-accent to-neuro-accent2 transition-all duration-300" style={{ width: `${(progress*100).toFixed(1)}%` }} />
              </div>
              <div className="text-xs text-gray-400">
                {keystroke?.sample ?
                  `Great! Keep typing normally. ${Math.max(0, targetSamples - keystroke.sample)} more keystrokes needed.` :
                  'Waiting for you to start typing...'
                }
              </div>
            </div>
            <button onClick={()=>setStep(2)} className="text-xs underline opacity-70 hover:opacity-100">What is measured?</button>
          </div>
        )}
        {step===2 && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-green-400">🔬 What We Measure</h3>
            <div className="space-y-3 text-xs">
              <div className="bg-gray-800/50 rounded p-3">
                <h4 className="font-semibold text-gray-300 mb-2">⌨️ Typing Patterns</h4>
                <ul className="space-y-1 text-gray-400">
                  <li>• <strong>Dwell time:</strong> How long you press each key</li>
                  <li>• <strong>Flight time:</strong> Time between releasing one key and pressing the next</li>
                  <li>• <strong>Rhythm entropy:</strong> Consistency of your typing rhythm</li>
                  <li>• <strong>Key combinations:</strong> Speed patterns for common letter pairs</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded p-3">
                <h4 className="font-semibold text-gray-300 mb-2">🖱️ Motor Control</h4>
                <ul className="space-y-1 text-gray-400">
                  <li>• <strong>Mouse velocity:</strong> Speed and smoothness of movements</li>
                  <li>• <strong>Tremor detection:</strong> Micro-movements that indicate neurological changes</li>
                  <li>• <strong>Click accuracy:</strong> Precision of mouse targeting</li>
                </ul>
              </div>
              <p className="text-center text-gray-500 text-[10px] mt-3">
                These patterns create a unique &quot;cognitive fingerprint&quot; that can detect changes over time.
              </p>
            </div>
            <button onClick={()=>setStep(1)} className="px-3 py-2 rounded bg-neuro-accent/20 hover:bg-neuro-accent/30">Back to Calibration</button>
          </div>
        )}
        {step===3 && (
          <div className="space-y-4 text-sm">
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-center">
              <div className="text-green-400 text-2xl mb-2">✅</div>
              <h3 className="font-semibold text-green-300 mb-2">Calibration Complete!</h3>
              <p className="text-gray-300 text-xs">
                Your personal baseline has been established. The system will now monitor for
                deviations &gt;2.5σ from your normal patterns that may indicate neurological changes.
              </p>
            </div>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <h4 className="font-semibold text-blue-300 text-xs mb-2">📊 Your Baseline Profile</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>Average dwell time: {keystroke?.meanDwell?.toFixed(1) || 'N/A'}ms</div>
                <div>Typing entropy: {keystroke?.entropy?.toFixed(2) || 'N/A'}</div>
                <div>Total samples: {keystroke?.sample || 0}</div>
                <div>Rhythm coefficient: {keystroke?.rhythmCoefficient?.toFixed(3) || 'N/A'}</div>
              </div>
            </div>
            <button onClick={()=>{
              if (keystroke && setBaselineKeystroke) {
                setBaselineKeystroke(keystroke);
              }
              setStep(4);
            }} className="px-4 py-2 rounded bg-neuro-accent text-black text-sm font-medium w-full">Continue to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

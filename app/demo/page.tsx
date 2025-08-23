import React from 'react';
import { DemoMode } from '../../src/demo/DemoMode';
import { TimeMachine } from '../../src/demo/TimeMachine';

export default function DemoPage(){
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Demo Mode</h1>
      <p className="text-sm text-gray-400 max-w-prose">Switch between curated scenarios and project disease progression forward with the Time Machine slider to illustrate subclinical → clinical transitions.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neuro-surface p-4 rounded-xl"><h2 className="text-sm font-semibold mb-2 text-gray-300 uppercase tracking-wider">Scenarios</h2><DemoMode /></div>
        <div className="bg-neuro-surface p-4 rounded-xl"><h2 className="text-sm font-semibold mb-2 text-gray-300 uppercase tracking-wider">Time Machine</h2><TimeMachine /></div>
      </div>
  <div className="text-[11px] text-gray-500">Scenario data synthesized based on published biomarker effect sizes (e.g., dwell time increase ~23% in early Parkinson&apos;s disease; voice jitter &gt;1%).</div>
    </div>
  );
}

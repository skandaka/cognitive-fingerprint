import React from 'react';
import { CognitiveProvider, useCognitive } from '../../src/state/GlobalState';

function MonitorInner(){
  const { keystrokeHistory, riskHistory } = useCognitive();
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Live Monitoring</h1>
      <div className="bg-neuro-surface p-4 rounded-xl text-xs max-h-72 overflow-auto">
        <h2 className="font-semibold mb-2 text-gray-300">Recent Keystroke Summaries</h2>
        {keystrokeHistory?.slice(-20).reverse().map((k,i)=>(
          <div key={i} className="grid grid-cols-5 gap-2 border-b border-white/5 py-1">
            <div>Dwell μ {k.meanDwell.toFixed(1)}</div>
            <div>Flight μ {k.meanFlight.toFixed(1)}</div>
            <div>σ² {k.varianceDwell.toFixed(1)}</div>
            <div>Entropy {k.entropy.toFixed(2)}</div>
            <div>n={k.sample}</div>
          </div>
        ))}
      </div>
      <div className="bg-neuro-surface p-4 rounded-xl text-xs">
        <h2 className="font-semibold mb-2 text-gray-300">Risk History (Last {riskHistory?.length||0} points)</h2>
        <div className="flex items-end space-x-1 h-32">
          {riskHistory?.slice(-120).map((r,i)=>(
            <div key={i} className="w-1 bg-neuro-accent" style={{ height: `${(r.risk||0)*100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Monitor(){
  return <CognitiveProvider><MonitorInner /></CognitiveProvider>;
}

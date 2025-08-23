import React, { useState } from 'react';
import { demoScenarios } from './SyntheticData';

export const DemoMode: React.FC = () => {
  const [scenario, setScenario] = useState('healthy_baseline');
  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        {Object.keys(demoScenarios).map(k => (
          <button key={k} className={`px-3 py-1 rounded text-sm ${scenario===k? 'bg-neuro-accent text-black':'bg-neuro-surface'}`} onClick={()=>setScenario(k)}>
            {k}
          </button>
        ))}
      </div>
      <pre className="text-xs bg-black/40 p-3 rounded max-h-64 overflow-auto">{JSON.stringify(demoScenarios[scenario], null, 2)}</pre>
    </div>
  );
};

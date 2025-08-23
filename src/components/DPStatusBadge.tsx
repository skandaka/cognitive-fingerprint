import React from 'react';
import { useCognitive } from '../state/GlobalState';

export const DPStatusBadge = () => {
  const { noiseActive, dpEpsilon } = useCognitive();
  return (
    <div aria-label="Differential Privacy Status" className={`inline-flex items-center gap-2 px-2 py-1 rounded text-[10px] font-medium border ${noiseActive? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-300':'bg-gray-600/15 border-gray-500/40 text-gray-300'}`}>
      <span className={`w-2 h-2 rounded-full ${noiseActive? 'bg-emerald-400 animate-pulse':'bg-gray-400'}`} />
      {noiseActive? `DP Active (ε=${dpEpsilon?.toFixed(2)})`:'DP Off'}
    </div>
  );
};

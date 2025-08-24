"use client";
import React from 'react';
import { useCognitive } from '../state/GlobalState';

export const ProgressionTimeline: React.FC = () => {
  const { riskHistory, confidence, risk } = useCognitive();

  if (!riskHistory || riskHistory.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <div className="mb-2">📊</div>
          <div>No historical data yet</div>
          <div className="text-xs mt-1">Data will appear as you use the app</div>
        </div>
      </div>
    );
  }

  const maxRisk = Math.max(...riskHistory.map(p => p.risk), 0.1);
  const minRisk = Math.min(...riskHistory.map(p => p.risk), 0);
  const range = maxRisk - minRisk || 0.1;

  return (
    <div className="h-40 flex flex-col">
      <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
        <span>Risk Progression Over Time</span>
        <span>{riskHistory.length} data points</span>
      </div>
      <div className="flex-1 flex items-end space-x-1">
        {riskHistory.slice(-50).map((point, i) => {
          const normalizedHeight = ((point.risk - minRisk) / range) * 100;
          const color = point.risk > 0.7 ? 'bg-red-500' : 
                       point.risk > 0.4 ? 'bg-yellow-500' : 'bg-green-500';
          return (
            <div 
              key={i} 
              className={`flex-1 ${color} opacity-80 rounded-t`} 
              style={{ height: `${Math.max(normalizedHeight, 5)}%` }}
              title={`Risk: ${(point.risk * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  );
};

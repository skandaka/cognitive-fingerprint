'use client';

import React, { useEffect, useState } from 'react';
import { useCognitive } from '../state/GlobalState';

interface Alert { id: string; ts: number; message: string; severity: 'info'|'warn'|'high'; confidence?: number; }

export const AlertCenter = () => {
  const { keystroke, risk, anomaly, confidence } = useCognitive();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const pushAlert = React.useCallback((alert: Omit<Alert,'id'|'ts'>) => {
    setAlerts((prev: Alert[]): Alert[] => {
      const newAlert: Alert = { ...alert, id: Math.random().toString(36).slice(2), ts: Date.now() };
      return [...prev.slice(-23), newAlert];
    });
  }, []);

  useEffect(()=>{
    if (!keystroke) return;
    if (keystroke.varianceDwell > 200 && (confidence??0) > 0.8) {
      pushAlert({ message: 'Elevated dwell time variability detected', severity: 'warn', confidence });
    }
  }, [keystroke, confidence, pushAlert]);

  useEffect(()=>{
    if (anomaly && anomaly > 0.8) {
      pushAlert({ message: 'Multi-modal anomaly spike', severity: 'high', confidence });
    }
  }, [anomaly, confidence, pushAlert]);

  useEffect(()=>{
    if (risk && risk > 0.6 && (confidence??0)>0.85) {
      pushAlert({ message: 'Sustained elevated composite risk index', severity: 'warn', confidence });
    }
  }, [risk, confidence, pushAlert]);

  return (
    <div className="bg-neuro-surface p-4 rounded-xl text-xs space-y-2">
      <h2 className="font-semibold text-gray-300 text-sm">Anomaly & Risk Alerts</h2>
      <div className="max-h-48 overflow-auto space-y-1 pr-1">
        {alerts.slice().reverse().map(a => (
          <div key={a.id} className={`p-2 rounded border flex justify-between items-center ${a.severity==='high'?'border-red-500/40 bg-red-500/10':a.severity==='warn'?'border-yellow-400/30 bg-yellow-400/10':'border-white/10 bg-white/5'}`}>
            <span>{a.message}{a.confidence?` (conf ${(a.confidence*100).toFixed(0)}%)`:''}</span>
            <span className="text-[9px] opacity-50">{new Date(a.ts).toLocaleTimeString()}</span>
          </div>
        ))}
        {!alerts.length && <div className="text-gray-500">No alerts yet.</div>}
      </div>
      <div className="text-[9px] text-gray-500">Alerts are heuristic, for demonstration only.</div>
    </div>
  );
};

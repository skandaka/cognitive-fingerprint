"use client";
import React, { useEffect, useState } from 'react';

export const ProgressionTimeline: React.FC = () => {
  const initial: {t:number; risk:number;}[] = Array.from({ length: 24 }, (_, i) => ({ t: i, risk: 0.1 + 0.4 * (1 - Math.exp(-i / 8)) }));
  const [points, setPoints] = useState<{t:number; risk:number;}[]>(initial);

  useEffect(()=> {
    // After mount, enrich with slight stochastic variability (preserves feature intent)
  setPoints(points.map(p => ({ ...p, risk: p.risk + Math.random()*0.03 })));
  }, []);

  return (
    <div className="h-40 flex items-end space-x-1">
      {points.map(p => (
        <div key={p.t} className="flex-1 bg-gradient-to-t from-neuro-accent/10 to-neuro-accent rounded" style={{ height: `${p.risk * 100}%` }} />
      ))}
    </div>
  );
};

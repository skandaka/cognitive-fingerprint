'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

export const PerfOverlay: FC = () => {
  const [fps, setFps] = useState(0);
  const [mem, setMem] = useState<string>('');
  const [cpuBusy, setCpuBusy] = useState(0);
  const last = useRef<number>();
  const frames = useRef<number>(0);
  const busyAccum = useRef<number>(0);
  const lastBusy = useRef<number>(performance.now());

  useEffect(()=>{
    let rafId: number;
    const loop = (t:number)=>{
      if (last.current !== null){
        const dt = t - last.current;
        frames.current++;
        const start = performance.now();
        for (let i=0;i<1500;i++) { Math.sqrt(i); }
        busyAccum.current += performance.now() - start;
      }
      last.current = t;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    const interval = window.setInterval(()=>{
      const now = performance.now();
      const elapsed = now - (lastBusy.current||now);
      const fpsCalc = frames.current * 1000 / elapsed;
      const cpu = (busyAccum.current / elapsed) * 100;
      setFps(fpsCalc);
      setCpuBusy(cpu);
      frames.current = 0; busyAccum.current = 0; lastBusy.current = now;
      if ((performance as any).memory){
        const m = (performance as any).memory;
        setMem(`${(m.usedJSHeapSize/1048576).toFixed(1)} / ${(m.jsHeapSizeLimit/1048576).toFixed(0)} MB`);
      }
    }, 1500);
    return ()=> { cancelAnimationFrame(rafId); clearInterval(interval); };
  },[]);

  return (
    <div className="fixed top-2 right-2 z-50 bg-black/70 backdrop-blur rounded-md px-3 py-2 text-[10px] font-mono text-gray-300 border border-white/10" aria-label="Performance Metrics">
      <div>FPS: {fps.toFixed(1)}</div>
      <div>CPU Busy: {cpuBusy.toFixed(1)}%</div>
      {mem && <div>Mem: {mem}</div>}
    </div>
  );
};

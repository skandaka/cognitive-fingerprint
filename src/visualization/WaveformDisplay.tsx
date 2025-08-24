import React, { useEffect, useRef, useState } from 'react';

export const WaveformDisplay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    // Mock data stream (replace with real keystroke intervals)
    let currentData: number[] = [];
    const interval = setInterval(() => {
      const newValue = 20 + Math.random() * 80 + (Math.random() < 0.05 ? Math.random() * 120 : 0);
      currentData = [...currentData.slice(-199), newValue];
      setData([...currentData]);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x=0; x<w; x+= w/10) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
    }
    for (let y=0; y<h; y+= h/4) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }

    // Draw waveform
    ctx.strokeStyle = '#3BAFDA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v,i) => {
      const x = (i / 200) * w;
      const y = h - (v / 200) * h;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }, [data]);

  return <canvas ref={canvasRef} width={600} height={180} className="w-full rounded bg-black/30" />;
};

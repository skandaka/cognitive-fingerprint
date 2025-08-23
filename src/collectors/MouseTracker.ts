export interface MouseSample {
  t: number;
  x: number;
  y: number;
}

export interface MouseMetrics {
  velocityMean: number;
  accelerationMean: number;
  tremorIndex?: number;
  sample: number;
}

export class MouseTracker {
  private samples: MouseSample[] = [];
  private last?: MouseSample;
  private raf?: number;
  private listeners: Set<(m:MouseMetrics)=>void> = new Set();

  start() {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', this.handleMove, { passive: true });
  }
  stop() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousemove', this.handleMove);
    if (this.raf) cancelAnimationFrame(this.raf);
  }
  onMetrics(l:(m:MouseMetrics)=>void){ this.listeners.add(l);}
  offMetrics(l:(m:MouseMetrics)=>void){ this.listeners.delete(l);}

  private handleMove = (e: MouseEvent) => {
    const t = performance.now();
    const sample: MouseSample = { t, x: e.clientX, y: e.clientY };
    this.samples.push(sample);
    if (!this.last) this.last = sample;
    if (!this.raf) this.raf = requestAnimationFrame(()=> this.compute());
  };

  private compute() {
    this.raf = undefined;
    const recent = this.samples.slice(-500);
    if (recent.length < 10) return;
    const velocities: number[] = [];
    const accelerations: number[] = [];
    for (let i=1;i<recent.length;i++) {
      const a = recent[i-1];
      const b = recent[i];
      const dt = (b.t - a.t)/1000;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const v = Math.hypot(dx,dy)/ (dt||1);
      velocities.push(v);
      if (i>1) {
        const prevV = velocities[velocities.length-2];
        accelerations.push((v - prevV)/(dt||1));
      }
    }
    const mean = (arr:number[]) => arr.reduce((s,v)=>s+v,0)/arr.length;
    // naive tremor index: high frequency velocity changes
    const tremorIndex = accelerations.reduce((s,v)=> s + Math.abs(v),0)/ (accelerations.length || 1);
    const metrics: MouseMetrics = {
      velocityMean: mean(velocities),
      accelerationMean: mean(accelerations),
      tremorIndex,
      sample: recent.length
    };
    this.listeners.forEach(l=>l(metrics));
  }
}

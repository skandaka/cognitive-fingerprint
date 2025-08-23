// EyeTracker: integrates WebGazer if available for real-time gaze (with fallback to mouse proxy)
export interface EyeFeatures {
  fixationStability: number; // lower is more stable
  saccadeRate: number; // per minute
  blinkRate: number; // per minute
  microsaccadeRate?: number; // rough small-movement events
  gazeConfidence?: number; // webgazer internal
  timestamp: number;
}

type Listener = (f: EyeFeatures)=>void;

export class EyeTracker {
  private listeners: Set<Listener> = new Set();
  private active = false;
  private saccades = 0;
  private blinks = 0;
  private lastVisibilityChange?: number;
  private lastPositions: {x:number;y:number;t:number;}[] = [];
  private interval?: any;

  async start(){
    if (this.active) return; this.active = true;
    if (typeof window === 'undefined') return;
    let usingWebGazer = false;
    try {
      const webgazer = (window as any).webgazer || await new Promise<any>(resolve => {
        if ((window as any).webgazer) return resolve((window as any).webgazer);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/webgazer@2.1.0/build/webgazer.min.js';
        s.async = true;
        s.onload = ()=> resolve((window as any).webgazer);
        s.onerror = ()=> resolve(undefined);
        document.head.appendChild(s);
      });
      if (webgazer) {
        usingWebGazer = true;
        webgazer.setGazeListener((data: any, ts: number)=> {
          if (!data) return; const t = ts || performance.now();
          const p = { x: data.x, y: data.y, t };
          const prev = this.lastPositions[this.lastPositions.length-1];
          if (prev){
            const dt = t - prev.t; const dist = Math.hypot(p.x-prev.x, p.y-prev.y);
            if (dt>20 && dist>50) this.saccades++;
            if (dt>10 && dist>8 && dist<40) this.saccades++; // treat as microsaccade candidate
          }
          (p as any).conf = data.eyetracker || data.confidence;
          this.lastPositions.push(p);
          if (this.lastPositions.length>400) this.lastPositions.shift();
        }).begin();
      }
    } catch {}

    if (!usingWebGazer){
      const handler = (e:MouseEvent)=>{
        const t = performance.now();
        const p = { x: e.clientX, y: e.clientY, t };
        const prev = this.lastPositions[this.lastPositions.length-1];
        if (prev){
          const dt = t - prev.t; const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
          if (dt > 30 && dist > 60) this.saccades++;
        }
        this.lastPositions.push(p);
        if (this.lastPositions.length>200) this.lastPositions.shift();
      };
      window.addEventListener('mousemove', handler);
      const visHandler = ()=> {
        const now = performance.now();
        if (document.visibilityState === 'hidden') { this.lastVisibilityChange = now; }
        else if (this.lastVisibilityChange && (now - this.lastVisibilityChange) < 400) { this.blinks++; }
      };
      document.addEventListener('visibilitychange', visHandler);
    }
    this.interval = setInterval(()=> this.emit(), 4000);
  }
  stop(){ this.active=false; clearInterval(this.interval); }
  onFeatures(l:Listener){ this.listeners.add(l); }
  offFeatures(l:Listener){ this.listeners.delete(l); }
  private emit(){
    if (!this.lastPositions.length) return;
  const positions = this.lastPositions.slice(-240);
    const cx = positions.reduce((s,p)=>s+p.x,0)/positions.length;
    const cy = positions.reduce((s,p)=>s+p.y,0)/positions.length;
    const dispersion = positions.reduce((s,p)=> s + Math.hypot(p.x-cx, p.y-cy),0)/positions.length;
  const fixationStability = dispersion/120; // normalize updated
  const minutes = 4/60; // interval is 4s
    const saccadeRate = this.saccades / minutes; this.saccades = 0;
    const blinkRate = this.blinks / minutes; this.blinks = 0;
  const micros = positions.filter((p,i)=> i>0 && Math.hypot(p.x-positions[i-1].x, p.y-positions[i-1].y)>8 && Math.hypot(p.x-positions[i-1].x, p.y-positions[i-1].y)<40).length / minutes;
  const confs = positions.map((p:any)=> p.conf).filter((c:any)=> c!==null);
  const gazeConfidence = confs.length? confs.reduce((s,c)=>s+c,0)/confs.length: undefined;
  const packet: EyeFeatures = { fixationStability, saccadeRate, blinkRate, microsaccadeRate: micros, gazeConfidence, timestamp: performance.now() };
    this.listeners.forEach(l=>l(packet));
  }
}

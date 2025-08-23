export interface KeystrokeEvent {
  key: string;
  code: string;
  downTime: number; // high-res timestamp
  upTime?: number;
  dwell?: number;
  force?: number; // Force Touch pressure if available
  digraph?: string; // two-key sequence
  trigraph?: string; // three-key sequence
}

export interface KeystrokeAnalyticsSummary {
  meanDwell: number;
  meanFlight: number;
  varianceDwell: number;
  varianceFlight: number;
  tremorHz?: number;
  entropy: number;
  sample: number;
  // Advanced medical biomarkers
  rhythmCoefficient: number; // coefficient of variation for rhythm
  keyOverlapEvents: number; // pressing next key before releasing previous
  correctionRate: number; // backspace/delete frequency
  wordPausePattern: number; // delays > 500ms indicating word-finding
  dwellTimeIncrease: number; // percentage increase from baseline
  tremor4to6Hz: number; // Parkinson's specific tremor frequency
  asymmetryIndex: number; // difference between left/right hand patterns
  fatigueIndex: number; // performance degradation over time
  digraphLatencies: Map<string, number>; // specific key-pair timings
  trigraphPatterns: Map<string, number>; // three-key sequence analysis
}

type SummaryListener = (summary: KeystrokeAnalyticsSummary) => void;

export class KeystrokeCollector {
  private active: Map<string, KeystrokeEvent> = new Map();
  private history: KeystrokeEvent[] = [];
  private lastUpTime?: number;
  private listeners: Set<SummaryListener> = new Set();
  private baseline: KeystrokeAnalyticsSummary | null = null;
  private sessionStart: number = performance.now();
  private correctionKeys = new Set(['Backspace', 'Delete']);
  private leftHandKeys = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']);
  private rightHandKeys = new Set(['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyN', 'KeyM']);

  start() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleDown, true);
    window.addEventListener('keyup', this.handleUp, true);
    console.log('KeystrokeCollector: Event listeners attached');
  }

  stop() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleDown, true);
    window.removeEventListener('keyup', this.handleUp, true);
  }

  onSummary(listener: SummaryListener) { this.listeners.add(listener); }
  offSummary(listener: SummaryListener) { this.listeners.delete(listener); }
  private publish(summary: KeystrokeAnalyticsSummary) { this.listeners.forEach(l => l(summary)); }

  private handleDown = (e: KeyboardEvent) => {
    const t = performance.now();
    if (!this.active.has(e.code)) {
      const force = this.extractForce(e);
      const digraph = this.getDigraph(e.code);
      const trigraph = this.getTrigraph(e.code);

      this.active.set(e.code, {
        key: e.key,
        code: e.code,
        downTime: t,
        force,
        digraph,
        trigraph
      });
      console.log('KeyDown:', e.code);
    }
  };

  private handleUp = (e: KeyboardEvent) => {
    const t = performance.now();
    const rec = this.active.get(e.code);
    if (rec) {
      rec.upTime = t;
      rec.dwell = t - rec.downTime;
      this.history.push(rec);
      this.active.delete(e.code);
      console.log('KeyUp:', e.code, 'History length:', this.history.length);
      const summary = this.analyzeRecent();
      if (summary) {
        console.log('Publishing summary with', summary.sample, 'samples');
        this.publish(summary);
      }
    }
  };

  private analyzeRecent(): KeystrokeAnalyticsSummary | null {
    const recent = this.history.slice(-300);
    if (recent.length < 5) return null; // Reduced threshold for better demo experience

    const dwells = recent.map(r => r.dwell || 0);
    const flights: number[] = [];
    for (let i=1;i<recent.length;i++) {
      const prev = recent[i-1];
      const curr = recent[i];
      if (prev.upTime && curr.downTime) flights.push(curr.downTime - prev.upTime);
    }

    const mean = (a:number[]) => a.reduce((s,v)=>s+v,0)/a.length;
    const meanDwell = mean(dwells);
    const meanFlight = flights.length? mean(flights):0;
    const variance = (a:number[], m:number) => a.reduce((s,v)=>s+Math.pow(v-m,2),0)/a.length;
    const varianceDwell = variance(dwells, meanDwell);
    const varianceFlight = flights.length? variance(flights, meanFlight):0;

    // Entropy over dwell distribution buckets
    const buckets = new Array(10).fill(0);
    dwells.forEach(d => {
      const idx = Math.min(9, Math.floor(d / 50));
      buckets[idx]++;
    });
    const total = dwells.length;
    const entropy = -buckets.reduce((s,c)=> {
      if (!c) return s; const p = c/total; return s + p * Math.log2(p);
    },0);

    // Advanced medical biomarkers
    const rhythmCoefficient = meanDwell > 0 ? Math.sqrt(varianceDwell) / meanDwell : 0;
    const keyOverlapEvents = this.countKeyOverlaps(recent);
    const correctionRate = this.calculateCorrectionRate(recent);
    const wordPausePattern = this.analyzeWordPauses(flights);
    const dwellTimeIncrease = this.calculateDwellIncrease(meanDwell);
    const tremor4to6Hz = this.detectTremor(dwells);
    const asymmetryIndex = this.calculateAsymmetry(recent);
    const fatigueIndex = this.calculateFatigue(recent);
    const digraphLatencies = this.analyzeDigraphs(recent);
    const trigraphPatterns = this.analyzeTrigraphs(recent);

    return {
      meanDwell,
      meanFlight,
      varianceDwell,
      varianceFlight,
      entropy,
      sample: recent.length,
      rhythmCoefficient,
      keyOverlapEvents,
      correctionRate,
      wordPausePattern,
      dwellTimeIncrease,
      tremor4to6Hz,
      asymmetryIndex,
      fatigueIndex,
      digraphLatencies,
      trigraphPatterns
    };
  }

  private extractForce(e: KeyboardEvent): number | undefined {
    // Force Touch support for MacBook trackpads
    return (e as any).webkitForce || undefined;
  }

  private getDigraph(currentCode: string): string | undefined {
    if (this.history.length === 0) return undefined;
    const lastEvent = this.history[this.history.length - 1];
    return `${lastEvent.code}-${currentCode}`;
  }

  private getTrigraph(currentCode: string): string | undefined {
    if (this.history.length < 2) return undefined;
    const lastEvent = this.history[this.history.length - 1];
    const secondLastEvent = this.history[this.history.length - 2];
    return `${secondLastEvent.code}-${lastEvent.code}-${currentCode}`;
  }

  private countKeyOverlaps(events: KeystrokeEvent[]): number {
    let overlaps = 0;
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      if (prev.upTime && curr.downTime && curr.downTime < prev.upTime) {
        overlaps++;
      }
    }
    return overlaps;
  }

  private calculateCorrectionRate(events: KeystrokeEvent[]): number {
    const corrections = events.filter(e => this.correctionKeys.has(e.code)).length;
    return events.length > 0 ? corrections / events.length : 0;
  }

  private analyzeWordPauses(flights: number[]): number {
    const wordPauses = flights.filter(f => f > 500).length; // pauses > 500ms
    return flights.length > 0 ? wordPauses / flights.length : 0;
  }

  private calculateDwellIncrease(currentMean: number): number {
    if (!this.baseline) return 0;
    return ((currentMean - this.baseline.meanDwell) / this.baseline.meanDwell) * 100;
  }

  private detectTremor(dwells: number[]): number {
    // Simple FFT-based tremor detection for 4-6Hz range (Parkinson's)
    if (dwells.length < 64) return 0;

    // Calculate power spectral density in 4-6Hz range
    const fftResult = this.simpleFFT(dwells.slice(-64));
    const fs = 1000 / (dwells.reduce((a, b) => a + b, 0) / dwells.length); // approximate sampling rate

    let tremorPower = 0;
    const startBin = Math.floor(4 * 64 / fs);
    const endBin = Math.floor(6 * 64 / fs);

    for (let i = startBin; i <= endBin && i < fftResult.length; i++) {
      tremorPower += fftResult[i];
    }

    return tremorPower;
  }

  private simpleFFT(data: number[]): number[] {
    // Simplified FFT for tremor detection
    const n = data.length;
    const spectrum = new Array(n / 2).fill(0);

    for (let k = 0; k < n / 2; k++) {
      let real = 0, imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = 2 * Math.PI * k * t / n;
        real += data[t] * Math.cos(angle);
        imag -= data[t] * Math.sin(angle);
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }

    return spectrum;
  }

  private calculateAsymmetry(events: KeystrokeEvent[]): number {
    const leftEvents = events.filter(e => this.leftHandKeys.has(e.code));
    const rightEvents = events.filter(e => this.rightHandKeys.has(e.code));

    if (leftEvents.length === 0 || rightEvents.length === 0) return 0;

    const leftMeanDwell = leftEvents.reduce((sum, e) => sum + (e.dwell || 0), 0) / leftEvents.length;
    const rightMeanDwell = rightEvents.reduce((sum, e) => sum + (e.dwell || 0), 0) / rightEvents.length;

    return Math.abs(leftMeanDwell - rightMeanDwell) / Math.max(leftMeanDwell, rightMeanDwell);
  }

  private calculateFatigue(events: KeystrokeEvent[]): number {
    if (events.length < 50) return 0;

    const firstHalf = events.slice(0, Math.floor(events.length / 2));
    const secondHalf = events.slice(Math.floor(events.length / 2));

    const firstMean = firstHalf.reduce((sum, e) => sum + (e.dwell || 0), 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((sum, e) => sum + (e.dwell || 0), 0) / secondHalf.length;

    return (secondMean - firstMean) / firstMean;
  }

  private analyzeDigraphs(events: KeystrokeEvent[]): Map<string, number> {
    const digraphs = new Map<string, number>();

    events.forEach(event => {
      if (event.digraph) {
        const current = digraphs.get(event.digraph) || 0;
        digraphs.set(event.digraph, current + 1);
      }
    });

    return digraphs;
  }

  private analyzeTrigraphs(events: KeystrokeEvent[]): Map<string, number> {
    const trigraphs = new Map<string, number>();

    events.forEach(event => {
      if (event.trigraph) {
        const current = trigraphs.get(event.trigraph) || 0;
        trigraphs.set(event.trigraph, current + 1);
      }
    });

    return trigraphs;
  }

  setBaseline(summary: KeystrokeAnalyticsSummary) {
    this.baseline = summary;
  }

  getBaseline(): KeystrokeAnalyticsSummary | null {
    return this.baseline;
  }
}

// VoiceAnalyzer: captures microphone audio and extracts core biomarkers (hackathon-grade)
export interface VoiceFeatures {
  f0: number;
  jitter: number;
  shimmer: number;
  hnr: number;
  mfcc: number[];
  energy: number;
  formants: number[]; // F1, F2, F3 approximate
  pauseRatio: number; // fraction of recent window considered silent
  phonationTimeSec: number; // cumulative voiced time in session
  timestamp: number;
  // Advanced medical biomarkers
  vot: number; // Voice onset time for plosive consonants
  speechRate: number; // syllables per second
  formantBandwidths: number[]; // F1, F2, F3 bandwidths
  vocalTremor: number; // 4-12Hz vocal tremor detection
  pitchVariability: number; // coefficient of variation of F0
  voiceQuality: number; // overall voice quality index (0-1)
  dysphoniaRisk: number; // risk score for voice disorders
  respiratoryPatterns: number; // breathing pattern regularity
}

type Listener = (f: VoiceFeatures) => void;

export class VoiceAnalyzer {
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private analyzer: any;
  private active = false;
  private lastPeriods: number[] = [];
  private lastAmps: number[] = [];
  private listeners: Set<Listener> = new Set();
  private voicedFrames = 0;
  private totalFrames = 0;
  private phonationTime = 0; // seconds
  private f0History: number[] = [];
  private energyHistory: number[] = [];
  private pauseDurations: number[] = [];
  private syllableCount = 0;
  private sessionStart = performance.now();
  private breathingEvents: number[] = [];

  async start(){
    if (this.active) return; this.active = true;
    if (typeof window === 'undefined') return;
    try {
      this.context = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.context.createMediaStreamSource(stream);
      // @ts-ignore dynamic import for runtime only
      const Meyda = await import('meyda');
      if (!Meyda?.createMeydaAnalyzer) return;
      this.analyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.context,
        source: this.source,
        bufferSize: 2048,
        featureExtractors: ['amplitudeSpectrum','rms','mfcc'],
        callback: (f:any)=> this.process(f)
      });
      this.analyzer.start();
    } catch {}
  }

  stop(){ this.active=false; try { this.analyzer?.stop(); this.context?.close(); } catch {} }
  onFeatures(l:Listener){ this.listeners.add(l);}
  offFeatures(l:Listener){ this.listeners.delete(l);}

  private process(f:any){
    if (!f) return;
  const mfcc: number[] = (f.mfcc||[]).slice(0,13);
  const energy: number = f.rms || 0;
  const spec: number[] = f.amplitudeSpectrum || [];
  const f0 = this.estimatePitch(spec, this.context!.sampleRate);
  const jitter = this.computeJitter(f0);
  const shimmer = this.computeShimmer(energy);
  const formants = this.estimateFormants(spec, this.context!.sampleRate);
  const voiced = energy > 0.01; // crude threshold
  this.totalFrames++;
  if (voiced) {
    this.voicedFrames++;
    this.phonationTime += (2048 / this.context!.sampleRate);
    this.detectSyllablePeak(energy);
  }
  const pauseRatio = this.totalFrames? 1 - (this.voicedFrames / this.totalFrames): 0;
  const hnr = this.estimateHNR(spec, f0, voiced);
  // Advanced biomarkers
  this.f0History.push(f0);
  this.energyHistory.push(energy);
  if (this.f0History.length > 100) this.f0History.shift();
  if (this.energyHistory.length > 100) this.energyHistory.shift();

  const vot = this.detectVOT(spec, energy, voiced);
  const speechRate = this.calculateSpeechRate();
  const formantBandwidths = this.calculateFormantBandwidths(spec, formants);
  const vocalTremor = this.detectVocalTremor();
  const pitchVariability = this.calculatePitchVariability();
  const voiceQuality = this.assessVoiceQuality(jitter, shimmer, hnr);
  const dysphoniaRisk = this.calculateDysphoniaRisk(jitter, shimmer, hnr);
  const respiratoryPatterns = this.analyzeRespiratoryPatterns();

  const packet: VoiceFeatures = {
    f0, jitter, shimmer, hnr, mfcc, energy, formants, pauseRatio,
    phonationTimeSec: this.phonationTime, timestamp: performance.now(),
    vot, speechRate, formantBandwidths, vocalTremor, pitchVariability,
    voiceQuality, dysphoniaRisk, respiratoryPatterns
  };
    this.listeners.forEach(l=>l(packet));
  }

  private estimatePitch(spectrum:number[], sr:number): number {
    if (!spectrum.length) return 0;
    const binSize = sr / (2 * spectrum.length);
    let best = 0, amp=0;
    const start = Math.floor(80/binSize); const end = Math.min(spectrum.length, Math.floor(350/binSize));
    for (let i=start;i<end;i++){ const a = spectrum[i]; if (a>amp){ amp=a; best=i*binSize; } }
    this.lastPeriods.push(1/(best||1)); if (this.lastPeriods.length>25) this.lastPeriods.shift();
    return best;
  }
  private computeJitter(f0:number): number {
    if (this.lastPeriods.length<3) return 0;
    const seg = this.lastPeriods.slice(-6);
    const diffs = seg.slice(1).map((p,i)=> Math.abs(p - seg[i]));
    const mean = seg.reduce((s,v)=>s+v,0)/seg.length;
    return (diffs.reduce((s,v)=>s+v,0)/diffs.length)/mean * 100;
  }
  private computeShimmer(rms:number): number {
    this.lastAmps.push(rms); if (this.lastAmps.length>25) this.lastAmps.shift();
    if (this.lastAmps.length<5) return 0;
    const seg = this.lastAmps.slice(-6);
    const diffs = seg.slice(1).map((a,i)=> Math.abs(a - seg[i]));
    const mean = seg.reduce((s,v)=>s+v,0)/seg.length;
    return (diffs.reduce((s,v)=>s+v,0)/diffs.length)/mean * 100;
  }
  private estimateFormants(spectrum:number[], sr:number): number[] {
    if (!spectrum.length) return [0,0,0];
    // Very crude: find peaks in first 3500 Hz excluding fundamental region
    const binSize = sr / (2 * spectrum.length);
    const peaks: {f:number;a:number;}[] = [];
    for (let i= Math.floor(300/binSize); i < Math.min(spectrum.length, Math.floor(3500/binSize)); i++){
      const a = spectrum[i];
      const prev = spectrum[i-1]||0, next = spectrum[i+1]||0;
      if (a>prev && a>next){
        peaks.push({ f: i*binSize, a });
      }
    }
    peaks.sort((x,y)=> y.a - x.a);
    const formants = peaks.slice(0,3).map(p=> p.f).sort((a,b)=> a-b);
    while(formants.length<3) formants.push(0);
    return formants;
  }
  private estimateHNR(spectrum:number[], f0:number, voiced:boolean): number {
    if (!voiced || !f0) return 0;
    const binSize = this.context!.sampleRate / (2 * spectrum.length);
    const fundamentalIndex = Math.floor(f0 / binSize);
    let harmonicEnergy = 0, noiseEnergy=0;
    for (let i=1;i<spectrum.length;i++){
      const amp = spectrum[i];
      const harmonic = (i % fundamentalIndex) < 2; // coarse heuristic
      if (harmonic) harmonicEnergy += amp*amp; else noiseEnergy += amp*amp;
    }
    if (!harmonicEnergy || !noiseEnergy) return 0;
    return 10 * Math.log10(harmonicEnergy / noiseEnergy);
  }

  private detectVOT(spectrum: number[], energy: number, voiced: boolean): number {
    // Voice Onset Time detection for plosive consonants
    // Simplified implementation - measures delay between burst and voicing
    if (!voiced) return 0;

    const binSize = this.context!.sampleRate / (2 * spectrum.length);
    let burstEnergy = 0;
    const highFreqStart = Math.floor(2000 / binSize);

    // Look for high-frequency burst energy (characteristic of plosives)
    for (let i = highFreqStart; i < Math.min(spectrum.length, Math.floor(6000 / binSize)); i++) {
      burstEnergy += spectrum[i];
    }

    // Simplified VOT calculation based on energy ratios
    const lowFreqEnergy = spectrum.slice(0, highFreqStart).reduce((a, b) => a + b, 0);
    return burstEnergy > 0 ? (burstEnergy / (burstEnergy + lowFreqEnergy)) * 100 : 0;
  }

  private calculateSpeechRate(): number {
    // Estimate syllables per second based on energy peaks
    const sessionDuration = (performance.now() - this.sessionStart) / 1000; // seconds
    return sessionDuration > 0 ? this.syllableCount / sessionDuration : 0;
  }

  private calculateFormantBandwidths(spectrum: number[], formants: number[]): number[] {
    // Estimate formant bandwidths by measuring spectral width around formant frequencies
    const binSize = this.context!.sampleRate / (2 * spectrum.length);
    const bandwidths: number[] = [];

    formants.forEach(formant => {
      if (formant === 0) {
        bandwidths.push(0);
        return;
      }

      const centerBin = Math.floor(formant / binSize);
      const peakAmplitude = spectrum[centerBin] || 0;
      const halfPeak = peakAmplitude * 0.707; // -3dB point

      let lowerBin = centerBin;
      let upperBin = centerBin;

      // Find bandwidth at -3dB points
      while (lowerBin > 0 && spectrum[lowerBin] > halfPeak) lowerBin--;
      while (upperBin < spectrum.length && spectrum[upperBin] > halfPeak) upperBin++;

      const bandwidth = (upperBin - lowerBin) * binSize;
      bandwidths.push(bandwidth);
    });

    while (bandwidths.length < 3) bandwidths.push(0);
    return bandwidths;
  }

  private detectVocalTremor(): number {
    // Detect 4-12Hz vocal tremor from F0 history
    if (this.f0History.length < 32) return 0;

    const recentF0 = this.f0History.slice(-32);
    const fftResult = this.performFFT(recentF0);

    // Calculate power in tremor frequency range (4-12Hz)
    let tremorPower = 0;
    const fs = 50; // approximate frame rate
    const startBin = Math.floor(4 * 32 / fs);
    const endBin = Math.floor(12 * 32 / fs);

    for (let i = startBin; i <= endBin && i < fftResult.length; i++) {
      tremorPower += fftResult[i];
    }

    return tremorPower;
  }

  private calculatePitchVariability(): number {
    if (this.f0History.length < 10) return 0;

    const voicedF0 = this.f0History.filter(f0 => f0 > 0);
    if (voicedF0.length < 5) return 0;

    const mean = voicedF0.reduce((a, b) => a + b, 0) / voicedF0.length;
    const variance = voicedF0.reduce((sum, f0) => sum + Math.pow(f0 - mean, 2), 0) / voicedF0.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? (stdDev / mean) * 100 : 0; // coefficient of variation
  }

  private assessVoiceQuality(jitter: number, shimmer: number, hnr: number): number {
    // Overall voice quality index based on medical thresholds
    let quality = 1.0;

    // Penalize high jitter (>1.04% indicates pathology)
    if (jitter > 1.04) quality -= (jitter - 1.04) * 0.1;

    // Penalize high shimmer (>3.81% indicates pathology)
    if (shimmer > 3.81) quality -= (shimmer - 3.81) * 0.05;

    // Penalize low HNR (<20dB indicates dysphonia)
    if (hnr < 20 && hnr > 0) quality -= (20 - hnr) * 0.02;

    return Math.max(0, Math.min(1, quality));
  }

  private calculateDysphoniaRisk(jitter: number, shimmer: number, hnr: number): number {
    // Risk assessment based on established medical thresholds
    let risk = 0;

    // Jitter threshold: >1.04% indicates potential pathology
    if (jitter > 1.04) risk += Math.min(0.4, (jitter - 1.04) * 0.2);

    // Shimmer threshold: >3.81% indicates potential pathology
    if (shimmer > 3.81) risk += Math.min(0.4, (shimmer - 3.81) * 0.1);

    // HNR threshold: <20dB indicates dysphonia
    if (hnr > 0 && hnr < 20) risk += Math.min(0.3, (20 - hnr) * 0.02);

    return Math.min(1, risk);
  }

  private analyzeRespiratoryPatterns(): number {
    // Analyze breathing patterns from energy fluctuations
    if (this.energyHistory.length < 20) return 0;

    const recentEnergy = this.energyHistory.slice(-20);

    // Find local minima (potential breathing pauses)
    const breathingPauses: number[] = [];
    for (let i = 1; i < recentEnergy.length - 1; i++) {
      if (recentEnergy[i] < recentEnergy[i-1] &&
          recentEnergy[i] < recentEnergy[i+1] &&
          recentEnergy[i] < 0.005) {
        breathingPauses.push(i);
      }
    }

    // Calculate regularity of breathing pattern
    if (breathingPauses.length < 3) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < breathingPauses.length; i++) {
      intervals.push(breathingPauses[i] - breathingPauses[i-1]);
    }

    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - meanInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Return regularity index (lower is more regular)
    return meanInterval > 0 ? stdDev / meanInterval : 0;
  }

  private performFFT(data: number[]): number[] {
    // Simple FFT implementation for tremor detection
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

  // Method to detect energy peaks that might indicate syllables
  private detectSyllablePeak(energy: number, threshold: number = 0.02): boolean {
    if (energy > threshold &&
        this.energyHistory.length > 0 &&
        energy > this.energyHistory[this.energyHistory.length - 1] * 1.5) {
      this.syllableCount++;
      return true;
    }
    return false;
  }
}

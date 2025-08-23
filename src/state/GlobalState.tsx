import React, { createContext, useContext, useEffect, useState } from 'react';
import { KeystrokeCollector, KeystrokeAnalyticsSummary } from '../collectors/KeystrokeCollector';
import { MouseTracker, MouseMetrics } from '../collectors/MouseTracker';
import { VoiceAnalyzer, VoiceFeatures } from '../collectors/VoiceAnalyzer';
import { CognitiveFingerprintModel } from '../analysis/PatternRecognition';
import { isolationForestScore } from '../analysis/AnomalyDetection';
import { EyeTracker, EyeFeatures } from '../collectors/EyeTracker';
import { deriveKey, encryptJSON, decryptJSON, anonymizeVector, deriveBaselineFingerprint } from '../api/privacy';

interface CognitiveState {
  keystroke?: KeystrokeAnalyticsSummary;
  mouse?: MouseMetrics;
  voice?: VoiceFeatures;
  eye?: EyeFeatures;
  risk?: number;
  anomaly?: number;
  confidence?: number;
  baselineKeystroke?: KeystrokeAnalyticsSummary;
  keystrokeHistory?: KeystrokeAnalyticsSummary[];
  riskHistory?: { t: number; risk: number; }[];
  exportData?: ()=>string;
  wipeData?: ()=>void;
  setDpEpsilon?: (e:number)=>void;
  dpEpsilon?: number;
  noiseActive?: boolean;
  toggleNoise?: ()=>void;
  setPassphrase?: (p:string)=>void;
  setBaselineKeystroke?: (baseline: KeystrokeAnalyticsSummary)=>void;
}

const CognitiveContext = createContext<CognitiveState>({});

export const CognitiveProvider = ({ children }: any) => {
  const [keystroke, setKeystroke] = useState<KeystrokeAnalyticsSummary>();
  const [mouse, setMouse] = useState<MouseMetrics>();
  const [voice, setVoice] = useState<VoiceFeatures>();
  const [eye, setEye] = useState<EyeFeatures>();
  const [risk, setRisk] = useState<number>();
  const [anomaly, setAnomaly] = useState<number>();
  const [confidence, setConfidence] = useState<number>();
  const [baselineKeystroke, setBaselineKeystroke] = useState<KeystrokeAnalyticsSummary>();
  const [keystrokeHistory, setKeystrokeHistory] = useState<KeystrokeAnalyticsSummary[]>([]);
  const [riskHistory, setRiskHistory] = useState<{t:number; risk:number;}[]>([]);
  const [dpEpsilon, setDpEpsilon] = useState(1.0);
  const [noiseActive, setNoiseActive] = useState<boolean>(false);
  const [passphrase, setPassphrase] = useState('demo-passphrase');
  const [baselineHash, setBaselineHash] = useState<string>();

  // Initialize collectors once
  useEffect(()=>{
    const kc = new KeystrokeCollector();
    kc.onSummary(s=> setKeystroke(s));
    kc.start();
    const mt = new MouseTracker();
    mt.onMetrics(m => setMouse(m));
    mt.start();
    const va = new VoiceAnalyzer();
    va.onFeatures(f=> setVoice(f));
    va.start().catch(()=>{});
    const et = new EyeTracker();
    et.onFeatures(f=> setEye(f));
    et.start();
    console.log('[GlobalState] Collectors initialized');
    return ()=> { kc.stop(); mt.stop(); va.stop(); et.stop(); };
  }, []);

  // Scoring interval (recreated only when noise parameters change)
  useEffect(()=>{
    const model = new CognitiveFingerprintModel();
  const interval = setInterval(()=>{
      if (!keystroke || !mouse) return;
      let features = {
        typing: [keystroke.meanDwell/200, keystroke.meanFlight/300, keystroke.varianceDwell/1000, keystroke.entropy/4, 0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        voice: voice? [voice.f0/300, voice.jitter/5, voice.shimmer/10, voice.hnr/40, ...(voice.mfcc.slice(0,9).map(v=>v/50))]: new Array(13).fill(0.1),
        motor: [mouse.velocityMean/1000, mouse.accelerationMean/5000, mouse.tremorIndex? mouse.tremorIndex/500:0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        temporal: new Array(12).fill(0.2)
      } as any;
      if (noiseActive) {
        features = {
          typing: anonymizeVector(features.typing, dpEpsilon),
          voice: anonymizeVector(features.voice, dpEpsilon),
          motor: anonymizeVector(features.motor, dpEpsilon),
          temporal: anonymizeVector(features.temporal, dpEpsilon)
        };
      }
      const scores = model.infer(features);
      setRisk(scores.overall);
      setConfidence(scores.confidence);
      const anom = isolationForestScore([...features.typing, ...features.voice, ...features.motor]);
      setAnomaly(anom.score);
      if (scores.overall !== null) {
        (setRiskHistory as any)((h:any) => {
          const next = [...(h||[]), { t: Date.now(), risk: scores.overall }];
          return next.slice(-500);
        });
      }
    }, 3000);
    return ()=> clearInterval(interval);
  }, [keystroke, mouse, voice, noiseActive, dpEpsilon]);

  // Encrypted persistence (demo): load existing encrypted snapshot if available
  useEffect(()=> {
    (async ()=>{
      if (typeof window === 'undefined') return;
      const blob = localStorage.getItem('encState');
      if (!blob) return;
      try {
  const key = await deriveKey(passphrase);
        const data = await decryptJSON(blob, key);
        if (data?.keystrokeHistory) setKeystrokeHistory(data.keystrokeHistory);
        if (data?.riskHistory) setRiskHistory(data.riskHistory);
        if (data?.baselineKeystroke) setBaselineKeystroke(data.baselineKeystroke);
      } catch {}
    })();
  }, [passphrase]);

  // Periodically persist encrypted snapshot
  useEffect(()=>{
    const id = setInterval(()=> {
      (async ()=>{
        if (typeof window === 'undefined') return;
        try {
    const key = await deriveKey(passphrase);
            const payload = { keystrokeHistory, riskHistory, baselineKeystroke };
            const enc = await encryptJSON(payload, key);
            localStorage.setItem('encState', enc);
        } catch {}
      })();
    }, 10000);
    return ()=> clearInterval(id);
  }, [keystrokeHistory, riskHistory, baselineKeystroke, passphrase]);

  // Auto-establish baseline after sufficient samples (if wizard not handling it)
  useEffect(()=> {
    if (!baselineKeystroke && keystroke && keystroke.sample > 300) {
      setBaselineKeystroke(keystroke);
    }
  }, [keystroke, baselineKeystroke]);

  // Derive baseline hash once baseline established (id-like, non-reversible)
  useEffect(()=> {
    (async ()=>{
      if (baselineKeystroke && !baselineHash) {
        const h = await deriveBaselineFingerprint(baselineKeystroke, voice, mouse);
        setBaselineHash(h);
      }
    })();
  }, [baselineKeystroke, baselineHash, voice, mouse]);

  // History of keystroke summaries
  useEffect(()=> {
    if (keystroke) {
  (setKeystrokeHistory as any)((h:any) => {
        const next = [...(h||[]), keystroke];
        return next.slice(-400);
      });
    }
  }, [keystroke]);

  function exportData(){
  const payload = { keystrokeHistory, riskHistory, baselineKeystroke, voice, mouse, eye, dpEpsilon, noiseActive, baselineHash };
    return JSON.stringify(payload, null, 2);
  }
  function wipeData(){
    setKeystrokeHistory([]); setRiskHistory([]); setBaselineKeystroke(undefined); setVoice(undefined); setMouse(undefined); setEye(undefined);
    if (typeof window !== 'undefined') localStorage.removeItem('encState');
  }
  const toggleNoise = ()=> setNoiseActive(!noiseActive);
  return <CognitiveContext.Provider value={{ keystroke, mouse, voice, eye, risk, anomaly, confidence, baselineKeystroke, keystrokeHistory, riskHistory, exportData, wipeData, dpEpsilon, setDpEpsilon, noiseActive, toggleNoise, setPassphrase, baselineHash, setBaselineKeystroke }}>{children}</CognitiveContext.Provider>;
};

export function useCognitive(){ return useContext(CognitiveContext); }

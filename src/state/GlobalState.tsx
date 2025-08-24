'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { KeystrokeCollector, KeystrokeAnalyticsSummary } from '../collectors/KeystrokeCollector';
import { MouseTracker } from '../collectors/MouseTracker';
import { VoiceAnalyzer, VoiceFeatures } from '../collectors/VoiceAnalyzer';
import { CognitiveFingerprintModel } from '../analysis/PatternRecognition';
import { isolationForestScore } from '../analysis/AnomalyDetection';
import { EyeTracker, EyeFeatures } from '../collectors/EyeTracker';
import { deriveKey, encryptJSON, decryptJSON, anonymizeVector, deriveBaselineFingerprint } from '../api/privacy';
import { createComponentLogger } from '../utils/Logger';
import { registerKeyboardFeatures, computeKeyboardFeatures } from '../features/KeyboardFeatures';
import { registerMouseFeatures, computeMouseFeatures } from '../features/MouseFeatures';
import { registerFocusFeatures } from '../features/FocusFeatures';
import { registerScrollFeatures } from '../features/ScrollFeatures';
import { registerCompositeFeatures } from '../features/CompositeFeatures';
import { featureRegistry } from '../features/FeatureRegistry';
import { baselineModeling, FeatureSnapshot } from '../analysis/BaselineModeling';
import { similarityScoring, SimilarityScore } from '../analysis/SimilarityScoring';
import { confidenceEstimation } from '../analysis/ConfidenceEstimation';
import { adaptiveRecognition, DriftDetection } from '../analysis/AdaptiveRecognition';
import { backgroundProcessor } from '../utils/BackgroundProcessor';
import { serviceWorkerManager } from '../utils/ServiceWorkerManager';

interface CognitiveState {
  keystroke?: KeystrokeAnalyticsSummary;
  // Raw sample arrays for feature extraction
  mouseSamples?: { t:number; x:number; y:number }[];
  // Aggregated feature outputs
  keyboardFeatures?: any;
  mouseFeatures?: any;
  similarity?: SimilarityScore;
  baseline?: any;
  confidenceAssessment?: any;
  drift?: DriftDetection | null;
  driftHistory?: DriftDetection[];
  similarityHistory?: { t:number; overall:number; confidence:number; }[];
  confidenceHistory?: { t:number; confidence:number; }[];
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
  aiConsent?: boolean;
  setAiConsent?: (v:boolean)=>void;
}

const CognitiveContext = createContext<CognitiveState>({});

export const CognitiveProvider = ({ children }: any) => {
  const [keystroke, setKeystroke] = useState<KeystrokeAnalyticsSummary>();
  const [mouseSamples, setMouseSamples] = useState<{t:number;x:number;y:number}[]>([]);
  const [keyboardFeatures, setKeyboardFeatures] = useState<any>();
  const [mouseFeatures, setMouseFeatures] = useState<any>();
  const [similarity, setSimilarity] = useState<SimilarityScore>();
  const [baseline, setBaseline] = useState<any>();
  const [confidenceAssessment, setConfidenceAssessment] = useState<any>();
  const [drift, setDrift] = useState<DriftDetection|null>(null);
  const [driftHistory, setDriftHistory] = useState<DriftDetection[]>([]);
  const [similarityHistory, setSimilarityHistory] = useState<{t:number; overall:number; confidence:number;}[]>([]);
  const [confidenceHistory, setConfidenceHistory] = useState<{t:number; confidence:number;}[]>([]);
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
  const [aiConsent, setAiConsent] = useState(false);
  const [baselineHash, setBaselineHash] = useState<string>();
  // Stable logger reference (avoid recreating object each render which was retriggering mount effect)
  const logger = React.useRef(createComponentLogger('GlobalState')).current;

  // Initialize collectors and service worker once
  useEffect(()=>{
    // Register feature extractors once
    try {
      registerKeyboardFeatures?.();
      registerMouseFeatures?.();
      registerFocusFeatures?.();
      registerScrollFeatures?.();
      registerCompositeFeatures?.();
      logger.info('Feature extractors registered', { stats: featureRegistry.getStats() });
    } catch (e) {
      logger.warn('Feature registration issue', { error: e instanceof Error? e.message: String(e)});
    }

    // Initialize Service Worker for background processing
    serviceWorkerManager.initialize().then(success => {
      if (success) {
        logger.info('Service Worker initialized for background processing');
      } else {
        logger.warn('Service Worker initialization failed');
      }
    });

    const kc = new KeystrokeCollector();
    kc.onSummary(s=> {
      setKeystroke(s);
      // Send keystroke data to Service Worker for background processing
      serviceWorkerManager.sendKeystrokeData(s);
    });
    kc.start();
    const mt = new MouseTracker();
    // Monkey patch to capture raw samples (accessing private for demo). In production expose accessor.
    const origHandle: any = (mt as any).handleMove;
    (mt as any).handleMove = (e: MouseEvent) => {
      origHandle.call(mt, e);
      const samples = (mt as any).samples as any[];
      if (samples && samples.length) setMouseSamples(samples.slice(-600));
    };
    mt.start();
    const va = new VoiceAnalyzer();
    va.onFeatures(f=> setVoice(f));
    va.start().catch(()=>{});
    const et = new EyeTracker();
    et.onFeatures(f=> setEye(f));
    et.start();
    logger.info('Collectors initialized');
    return ()=> { kc.stop(); mt.stop(); va.stop(); et.stop(); };
  }, []); // run once on mount

  // Periodic feature extraction & baseline / similarity pipeline using background processor
  useEffect(()=> {
    const sessionId = 'session-' + Math.floor(Date.now()/1000);
    
    backgroundProcessor.registerTask({
      id: 'feature-extraction',
      name: 'Feature Extraction Pipeline',
      intervalMs: 5000,
      fn: async () => {
        try {
          if (!keystroke && mouseSamples.length < 10) return;
          if (keystroke) {
            try {
              const kf = await computeKeyboardFeatures(keystroke as any, sessionId);
              setKeyboardFeatures(kf);
            } catch (err) {
              logger.warn('Keyboard feature compute failed', { error: err instanceof Error? err.message: String(err)});
            }
          }
          if (mouseSamples.length > 5) {
            try {
              const mf = await computeMouseFeatures(mouseSamples as any, sessionId);
              setMouseFeatures(mf);
            } catch (err) {
              logger.warn('Mouse feature compute failed', { error: err instanceof Error? err.message: String(err)});
            }
          }
          const snapshot: FeatureSnapshot = {
            timestamp: Date.now(),
            sessionId,
            keyboard: keyboardFeatures,
            mouse: mouseFeatures,
            environmentalContext: { device: 'unknown' },
            quality: 0.8
          };
          if (keyboardFeatures || mouseFeatures) {
            baselineModeling.addSnapshot('demoUser', snapshot);
          }
          const currentBaseline = baselineModeling.getBaseline('demoUser');
          if (currentBaseline) {
            setBaseline(currentBaseline);
            const sim = await similarityScoring.computeSimilarity(snapshot, currentBaseline);
            setSimilarity(sim);
            setSimilarityHistory(h => [...h.slice(-499), { t: sim.timestamp, overall: sim.overall, confidence: sim.confidence }]);
            setConfidenceHistory(h => [...h.slice(-499), { t: sim.timestamp, confidence: sim.confidence }]);
            try {
              const conf = await confidenceEstimation.assessConfidence('demoUser', sim, currentBaseline);
              setConfidenceAssessment(conf);
            } catch (err) {
              logger.warn('Confidence assessment failed', { error: err instanceof Error? err.message: String(err)});
            }
            try {
              const driftDetected = await adaptiveRecognition.processNewScore('demoUser', sim);
              if (driftDetected) {
                setDrift(driftDetected);
                setDriftHistory(prev => [...prev.slice(-49), driftDetected]);
              }
            } catch (err) {
              logger.warn('Drift detection failed', { error: err instanceof Error? err.message: String(err)});
            }
          }
        } catch (err) {
          logger.warn('Pipeline tick failed', { error: err instanceof Error? err.message: String(err) });
        }
      }
    });

    return () => backgroundProcessor.unregisterTask('feature-extraction');
  }, [keystroke, mouseSamples, keyboardFeatures, mouseFeatures, logger]);

  // Scoring interval using background processor
  useEffect(()=>{
    const model = new CognitiveFingerprintModel();
    
    backgroundProcessor.registerTask({
      id: 'risk-scoring',
      name: 'Risk Scoring Pipeline',
      intervalMs: 3000,
      fn: () => {
        if (!keystroke) return;
        let features = {
          typing: [keystroke.meanDwell/200, keystroke.meanFlight/300, keystroke.varianceDwell/1000, keystroke.entropy/4, 0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          voice: voice? [voice.f0/300, voice.jitter/5, voice.shimmer/10, voice.hnr/40, ...(voice.mfcc.slice(0,9).map(v=>v/50))]: new Array(13).fill(0.1),
          motor: [mouseFeatures?.meanVelocity? mouseFeatures.meanVelocity/1000:0, mouseFeatures?.meanAcceleration? mouseFeatures.meanAcceleration/5000:0, mouseFeatures?.tremorAmplitude? mouseFeatures.tremorAmplitude/500:0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
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
      }
    });

    return () => backgroundProcessor.unregisterTask('risk-scoring');
  }, [keystroke, voice, noiseActive, dpEpsilon, mouseFeatures, logger]);

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
  const h = await deriveBaselineFingerprint(baselineKeystroke, voice, mouseFeatures);
        setBaselineHash(h);
      }
    })();
  }, [baselineKeystroke, baselineHash, voice, mouseFeatures]);

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
  const payload = { keystrokeHistory, riskHistory, baselineKeystroke, voice, mouseSamples, eye, dpEpsilon, noiseActive, baselineHash, similarity, similarityHistory, confidenceHistory, driftHistory };
    return JSON.stringify(payload, null, 2);
  }
  function wipeData(){
  setKeystrokeHistory([]); setRiskHistory([]); setBaselineKeystroke(undefined); setVoice(undefined); setMouseSamples([]); setEye(undefined); setKeyboardFeatures(undefined); setMouseFeatures(undefined); setSimilarity(undefined); setBaseline(undefined); setConfidenceAssessment(undefined);
    if (typeof window !== 'undefined') localStorage.removeItem('encState');
  }
  const toggleNoise = ()=> setNoiseActive(!noiseActive);
  return <CognitiveContext.Provider value={{ keystroke, mouseSamples, keyboardFeatures, mouseFeatures, similarity, similarityHistory, confidenceHistory, baseline, confidenceAssessment, drift, driftHistory, voice, eye, risk, anomaly, confidence, baselineKeystroke, keystrokeHistory, riskHistory, exportData, wipeData, dpEpsilon, setDpEpsilon, noiseActive, toggleNoise, setPassphrase, baselineHash, setBaselineKeystroke, aiConsent, setAiConsent }}>{children}</CognitiveContext.Provider>;
};

export function useCognitive(){ return useContext(CognitiveContext); }

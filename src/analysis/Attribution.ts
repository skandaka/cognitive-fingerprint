// SHAP-style group attribution approximation for multi-modal features (demo-quality)
import { CognitiveFingerprintModel, MultiModalFeatures } from './PatternRecognition';

export interface GroupAttribution { group: string; contribution: number; }

interface GroupDef { key: keyof MultiModalFeatures; label: string; }

const GROUPS: GroupDef[] = [
  { key: 'typing', label: 'Typing' },
  { key: 'voice', label: 'Voice' },
  { key: 'motor', label: 'Motor' },
  { key: 'temporal', label: 'Temporal' }
];

function clone(f: MultiModalFeatures): MultiModalFeatures {
  return { typing: [...f.typing], voice: [...f.voice], motor: [...f.motor], temporal: [...f.temporal] };
}

// Random baseline vector (all groups masked) -> inserted as small noise so model returns low base risk
function masked(f: MultiModalFeatures, groups: (keyof MultiModalFeatures)[]): MultiModalFeatures {
  const out = clone(f);
  const zero = (arr: number[]) => arr.map(()=> 0.05 + Math.random()*0.01);
  (['typing','voice','motor','temporal'] as (keyof MultiModalFeatures)[]).forEach(k=>{
    if (!groups.includes(k)) (out as any)[k] = zero((out as any)[k]);
  });
  return out;
}

export function shapGroupAttribution(model: CognitiveFingerprintModel, features: MultiModalFeatures, samples=64): GroupAttribution[] {
  const contrib: Record<string, number[]> = {};
  GROUPS.forEach(g=> contrib[g.label] = []);
  for (let s=0; s<samples; s++) {
    // random permutation of groups
    const order = [...GROUPS].sort(()=> Math.random()-0.5);
    const active: (keyof MultiModalFeatures)[] = [];
    let prevScore = model.infer(masked(features, active)).overall;
    order.forEach(g => {
      active.push(g.key);
      const curScore = model.infer(masked(features, active)).overall;
      const delta = curScore - prevScore;
      contrib[g.label].push(delta);
      prevScore = curScore;
    });
  }
  const atts: GroupAttribution[] = GROUPS.map(g => {
    const arr = contrib[g.label];
    const mean = arr.reduce((s,v)=>s+v,0)/(arr.length||1);
    return { group: g.label, contribution: mean };
  });
  // normalize absolute contributions
  const denom = atts.reduce((s,a)=> s + Math.abs(a.contribution), 0) || 1;
  atts.forEach(a => a.contribution = +(a.contribution/denom).toFixed(3));
  return atts.sort((a,b)=> Math.abs(b.contribution) - Math.abs(a.contribution));
}

// Per-feature attribution (coarse) using permutation-style masking within each group.
export interface FeatureAttribution { feature: string; contribution: number; group: string; }

export function permutationFeatureAttribution(model: CognitiveFingerprintModel, features: MultiModalFeatures, sampleFrac=0.6): FeatureAttribution[] {
  const base = model.infer(features).overall;
  const results: FeatureAttribution[] = [];
  const processGroup = (groupKey: keyof MultiModalFeatures, label: string) => {
    const arr = (features as any)[groupKey] as number[];
    const n = arr.length;
    const picks = Math.max(3, Math.floor(n*sampleFrac));
    const indices = Array.from({length:n}, (_,i)=>i).sort(()=> Math.random()-0.5).slice(0,picks);
    indices.forEach(idx => {
      const cloneF: MultiModalFeatures = {
        typing: [...features.typing],
        voice: [...features.voice],
        motor: [...features.motor],
        temporal: [...features.temporal]
      };
      (cloneF as any)[groupKey][idx] = 0.05; // mask to baseline noise
      const v = model.infer(cloneF).overall;
      const impact = Math.abs(v - base);
      results.push({ feature: `${label}[${idx}]`, contribution: impact, group: label });
    });
  };
  GROUPS.forEach(g => processGroup(g.key, g.label));
  const max = results.reduce((m,r)=> r.contribution>m? r.contribution:m, 0) || 1;
  results.forEach(r => r.contribution = +(r.contribution / max).toFixed(3));
  return results.sort((a,b)=> b.contribution - a.contribution).slice(0,25);
}

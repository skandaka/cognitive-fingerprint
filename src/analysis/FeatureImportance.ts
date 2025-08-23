// Simple permutation-style importance (hackathon heuristic)
import { CognitiveFingerprintModel, MultiModalFeatures } from './PatternRecognition';

export interface FeatureImpact { name: string; impact: number; }

function cloneFeatures(f: MultiModalFeatures): MultiModalFeatures {
  return { typing: [...f.typing], voice: [...f.voice], motor: [...f.motor], temporal: [...f.temporal] };
}

export function computeImportance(model: CognitiveFingerprintModel, baseFeatures: MultiModalFeatures): FeatureImpact[] {
  const baseRisk = model.infer(baseFeatures).overall;
  const impacts: FeatureImpact[] = [];
  const groups: { key: keyof MultiModalFeatures; label: string; }[] = [
    { key: 'typing', label: 'Typing rhythm' },
    { key: 'voice', label: 'Voice acoustics' },
    { key: 'motor', label: 'Motor control' },
    { key: 'temporal', label: 'Temporal dynamics' }
  ];
  groups.forEach(g => {
    const perturbed = cloneFeatures(baseFeatures);
    perturbed[g.key] = perturbed[g.key].map(v => v + (Math.random()*0.4 - 0.2));
    const newRisk = model.infer(perturbed).overall;
    impacts.push({ name: g.label, impact: Math.abs(newRisk - baseRisk) });
  });
  const max = impacts.reduce((m,i)=> i.impact>m? i.impact:m, 0) || 1;
  impacts.forEach(i => i.impact = +(i.impact / max).toFixed(3));
  return impacts.sort((a,b)=> b.impact - a.impact);
}

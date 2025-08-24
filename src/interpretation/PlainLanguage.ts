import { SimilarityScore } from '../analysis/SimilarityScoring';
import { DriftDetection } from '../analysis/AdaptiveRecognition';

export interface PlainInsight {
  id: string;
  title: string;
  level: 'good' | 'caution' | 'alert';
  message: string;
  detail?: string;
}

export function summarizeSimilarity(sim?: SimilarityScore): PlainInsight | null {
  if (!sim) return null;
  const overall = sim.overall;
  if (overall > 0.85) return { id: 'similarity', title: 'Pattern Consistency', level: 'good', message: 'Your current interaction pattern is very consistent with your baseline.' };
  if (overall > 0.65) return { id: 'similarity', title: 'Pattern Consistency', level: 'caution', message: 'Some mild variation in your interaction pattern. This can be normal.' };
  return { id: 'similarity', title: 'Pattern Consistency', level: 'alert', message: 'Noticeable changes from baseline detected. If this persists, consider a rest break or consultation.' };
}

export function summarizeDrift(drift?: DriftDetection | null): PlainInsight | null {
  if (!drift) return null;
  const mag = drift.driftMagnitude;
  if (mag < 0.05) return null; // too small to surface separately
  if (mag < 0.12) return { id: 'drift', title: 'Trend Shift', level: 'caution', message: 'Gradual shift in interaction trend. Monitoring.' };
  return { id: 'drift', title: 'Trend Shift', level: 'alert', message: 'Significant shift emerging vs baseline. Recalibration may be helpful.' };
}

export function buildInsights(sim?: SimilarityScore, drift?: DriftDetection | null): PlainInsight[] {
  const insights: PlainInsight[] = [];
  const s = summarizeSimilarity(sim); if (s) insights.push(s);
  const d = summarizeDrift(drift); if (d) insights.push(d);
  if (!insights.length) insights.push({ id: 'collecting', title: 'Collecting Data', level: 'caution', message: 'Still gathering enough information to summarize.' });
  return insights;
}

export function levelColor(level: PlainInsight['level']): string {
  switch(level){
    case 'good': return 'text-green-400';
    case 'caution': return 'text-amber-400';
    case 'alert': return 'text-red-400';
  }
}

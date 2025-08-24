import React from 'react';
import { CognitiveProvider, useCognitive } from '../../src/state/GlobalState';
import { buildInsights, levelColor } from '../../src/interpretation/PlainLanguage';
import { useAIInsights } from '../../src/hooks/useAIInsights';

function InsightList(){
  const { similarity, drift } = useCognitive();
  const insights = buildInsights(similarity, drift);
  return (
    <div className="space-y-3">
      {insights.map(i=> (
        <div key={i.id} className="p-4 rounded-lg bg-neuro-surface border border-white/5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{i.title}</span>
            <span className={"text-xs font-medium " + levelColor(i.level)}>{i.level.toUpperCase()}</span>
          </div>
          <div className="mt-1 text-gray-300 text-sm leading-snug">{i.message}</div>
        </div>
      ))}
    </div>
  );
}

function KeyNumbers(){
  const { similarity, baseline, confidenceAssessment } = useCognitive();
  const items: { label:string; value:string; help:string }[] = [];
  if (baseline) items.push({ label: 'Baseline Confidence', value: (baseline.statistics.confidence*100).toFixed(0)+'%', help: 'How solid the baseline profile is.' });
  if (similarity) items.push({ label: 'Current Match', value: (similarity.overall*100).toFixed(0)+'%', help: 'How closely current data matches baseline.' });
  if (confidenceAssessment) items.push({ label: 'Data Quality', value: (confidenceAssessment.components.dataQuality.score*100).toFixed(0)+'%', help: 'Signal quality of inbound data.' });
  if (!items.length) items.push({ label: 'Collecting', value: '...', help: 'Need more activity to compute metrics.' });
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(it=> (
        <div key={it.label} className="p-4 rounded-lg bg-neuro-surface border border-white/5">
          <div className="text-xs text-gray-400 mb-1">{it.label}</div>
          <div className="text-2xl font-semibold tracking-tight">{it.value}</div>
          <div className="text-[11px] text-gray-500 mt-1">{it.help}</div>
        </div>
      ))}
    </div>
  );
}

function DashboardInner(){
  const cognitive = useCognitive();
  const { summary, run } = useAIInsights();
  const snapshot = {
    similarity: cognitive.similarity,
    baseline: cognitive.baseline ? { statistics: cognitive.baseline.statistics } : undefined,
    drift: cognitive.drift ? { driftMagnitude: cognitive.drift.driftMagnitude, driftSeverity: cognitive.drift.driftSeverity } : undefined
  };
  const canAI = cognitive.aiConsent;
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Simple Dashboard</h1>
      <KeyNumbers />
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Plain Language Insights</h2>
          <button disabled={!canAI || summary.loading} onClick={()=> run(snapshot,'summary')} className={`px-3 py-1 rounded text-xs border ${canAI? 'border-neuro-accent text-neuro-accent hover:bg-neuro-accent/10':'border-gray-600 text-gray-600 cursor-not-allowed'}`}>{summary.loading? 'Generating...':'AI Summary'}</button>
        </div>
        <InsightList />
        {summary.content && (
          <div className="mt-4 p-4 rounded-lg bg-neuro-surface border border-white/5 text-sm leading-snug whitespace-pre-wrap" aria-label="AI Summary">
            {summary.content}
            <div className="mt-2 text-[10px] text-gray-500">AI-generated. Not medical advice.</div>
          </div>
        )}
        {summary.error && (
          <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-xs">AI unavailable: {summary.error}{summary.fallback && <div className="mt-1 text-[10px] text-gray-400">Fallback: {summary.fallback}</div>}</div>
        )}
        {!canAI && (
          <div className="mt-2 text-[10px] text-gray-500">Enable AI summaries in Privacy settings to generate an extended explanation.</div>
        )}
      </div>
      <div className="text-xs text-gray-500 max-w-prose leading-relaxed">
        This tool provides general interaction pattern information. It is not a medical diagnosis. For professional assessment please use the Advanced view.
      </div>
    </div>
  );
}

export default function Page(){
  return <CognitiveProvider><DashboardInner /></CognitiveProvider>;
}

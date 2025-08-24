import React from 'react';
import { CognitiveProvider, useCognitive } from '../../src/state/GlobalState';
import { useAIInsights } from '../../src/hooks/useAIInsights';

function ChatInner(){
  const { similarity, baseline, drift, aiConsent } = useCognitive();
  const { summary, run } = useAIInsights();
  const [question, setQuestion] = React.useState('');
  const snapshot = {
    similarity: similarity ? { overall: similarity.overall, confidence: similarity.confidence } : undefined,
    baseline: baseline ? { confidence: baseline.statistics.confidence, stability: baseline.statistics.stability } : undefined,
    drift: drift ? { magnitude: drift.driftMagnitude, severity: drift.driftSeverity, type: drift.driftType } : undefined
  };
  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      {!aiConsent && <div className="p-3 rounded bg-amber-500/10 border border-amber-400/30 text-xs">Enable AI summaries in Privacy Settings to use the assistant. Only aggregated metrics are shared.</div>}
      <div className="p-4 rounded bg-neuro-surface border border-white/5 space-y-3 text-sm">
        <div className="text-xs text-gray-400">Snapshot Preview (sanitized)</div>
        <pre className="text-[10px] bg-black/30 p-2 rounded overflow-auto max-h-40">{JSON.stringify(snapshot, null, 2)}</pre>
        <div className="flex gap-2 items-center">
          <input value={question} onChange={e=> setQuestion(e.target.value)} placeholder="Ask a question about the current pattern" className="flex-1 bg-black/40 px-3 py-2 rounded text-xs" />
          <button disabled={!aiConsent || summary.loading || !question.trim()} onClick={()=> run(snapshot,'qa', question)} className={`px-3 py-2 rounded text-xs border ${aiConsent? 'border-neuro-accent text-neuro-accent hover:bg-neuro-accent/10':'border-gray-600 text-gray-600 cursor-not-allowed'}`}>{summary.loading? 'Asking...':'Ask'}</button>
        </div>
        {summary.content && <div className="mt-2 p-3 rounded bg-black/30 border border-white/5 text-xs whitespace-pre-wrap">{summary.content}</div>}
        {summary.error && <div className="mt-2 p-3 rounded bg-red-500/10 border border-red-500/30 text-xs">Error: {summary.error}{summary.fallback && <div className="mt-1 text-[10px] text-gray-400">Fallback: {summary.fallback}</div>}</div>}
      </div>
      <div className="text-[10px] text-gray-500">AI output is experimental and not medical advice.</div>
    </div>
  );
}

export default function AssistantPage(){
  return <CognitiveProvider><ChatInner /></CognitiveProvider>;
}

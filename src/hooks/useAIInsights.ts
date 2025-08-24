import React from 'react';

interface AIResult { loading: boolean; content?: string; error?: string; fallback?: string; }

export function useAIInsights(){
  const [summary, setSummary] = React.useState({ loading: false } as AIResult);
  const run = React.useCallback(async (snapshot: any, scope: 'summary' | 'qa' = 'summary', question?: string)=>{
    setSummary({ loading: true });
    try {
      const resp = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, question, snapshot }) });
      const json = await resp.json();
      if (json.ok) setSummary({ loading: false, content: json.content });
      else setSummary({ loading: false, error: json.error, fallback: json.fallback });
    } catch (e:any){
      setSummary({ loading:false, error: String(e) });
    }
  }, []);
  return { summary, run };
}

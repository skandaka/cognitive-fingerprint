'use client';

import React, { useEffect, useState, ReactNode } from 'react';

function ConsentBanner(){
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = typeof window !== 'undefined' ? localStorage.getItem('consent') : 'yes';
      if (!v) setVisible(true);
    } catch {}
  }, []);

  function accept(){
    try { localStorage.setItem('consent','yes'); } catch {}
    setVisible(false);
  }
  function decline(){
    try { localStorage.setItem('consent','no'); } catch {}
    setVisible(false);
  }

  if (!mounted || !visible) return null;
  return (
    <div role="dialog" aria-labelledby="consent-title" aria-modal="true" className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-neuro-surface max-w-lg w-full rounded-xl p-5 space-y-3 text-sm shadow-xl border border-white/10">
        <h2 id="consent-title" className="text-lg font-semibold">Privacy & Consent</h2>
        <p>This prototype processes interaction & audio locally for research demonstration. No data leaves your device unless you explicitly export it. Provide informed consent to proceed.</p>
        <ul className="list-disc ml-5 text-gray-400 text-xs space-y-1">
          <li>Analytics run in-browser; you may wipe at any time.</li>
          <li>Microphone & interaction capture stays local.</li>
          <li>Export feature lets you review raw synthetic metrics.</li>
        </ul>
        <div className="flex gap-3 pt-2">
          <button onClick={accept} className="px-4 py-2 rounded bg-neuro-accent text-black font-medium">I Consent</button>
          <button onClick={decline} className="px-4 py-2 rounded bg-red-500/30 hover:bg-red-500/40">Decline</button>
        </div>
        <p className="text-[10px] text-gray-500">Demo only – not a medical device.</p>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode; }){
  const [hc, setHc] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(()=> { setMounted(true); }, []);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-neuro-accent text-black px-3 py-1 rounded">Skip to main</a>
      {mounted && (
        <button
          aria-pressed={hc}
          aria-label="Toggle high contrast"
          onClick={()=> setHc(!hc)}
          className="fixed bottom-4 right-4 z-50 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px]"
        >
          Contrast {hc? 'On':'Off'}
        </button>
      )}
      <div className={hc? 'high-contrast min-h-full':'min-h-full'} id="main">{children}</div>
      <ConsentBanner />
    </>
  );
}

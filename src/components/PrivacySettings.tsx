import React, { useState } from 'react';
import { useCognitive } from '../state/GlobalState';

export const PrivacySettings = () => {
  const { dpEpsilon, setDpEpsilon, noiseActive, toggleNoise, setPassphrase } = useCognitive();
  const [localPass, setLocalPass] = useState('');
  return (
    <div className="bg-neuro-surface rounded-xl p-4 shadow text-xs space-y-3" aria-label="Privacy & Differential Privacy Settings">
      <h3 className="font-semibold text-gray-300 text-sm">Privacy Controls</h3>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!noiseActive} onChange={toggleNoise} aria-label="Toggle differential privacy noise" />
          <span>DP Noise</span>
        </label>
        <label className="flex items-center gap-1">ε
          <input type="number" step="0.1" min="0.1" className="bg-black/40 px-2 py-1 rounded w-20" value={dpEpsilon} onChange={e=> setDpEpsilon && setDpEpsilon(parseFloat(e.target.value)||1)} />
        </label>
      </div>
      <div className="space-y-1">
        <label className="block text-gray-400">Encryption Passphrase</label>
        <input type="password" className="bg-black/40 px-2 py-1 rounded w-full" value={localPass} onChange={e=>setLocalPass(e.target.value)} placeholder="Enter new passphrase" />
        <button onClick={()=> { if (localPass && setPassphrase) { setPassphrase(localPass); setLocalPass(''); } }} className="px-3 py-1 rounded bg-neuro-accent/20 hover:bg-neuro-accent/30">Apply</button>
      </div>
      <p className="text-[10px] text-gray-500">Demo DP adds Gaussian noise client-side. Not production-grade privacy.</p>
    </div>
  );
};

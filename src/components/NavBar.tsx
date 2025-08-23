import React from 'react';

export const NavBar = () => (
  <nav className="w-full flex items-center justify-between px-6 py-3 bg-neuro-surface border-b border-white/5 text-sm">
    <div className="font-semibold tracking-wide">Cognitive Fingerprint</div>
    <div className="flex space-x-4">
      <a href="/" className="hover:text-neuro-accent">Dashboard</a>
      <a href="/monitor" className="hover:text-neuro-accent">Live Monitor</a>
      <a href="/report" className="hover:text-neuro-accent">Report</a>
      <a href="/demo" className="hover:text-neuro-accent">Demo Mode</a>
    </div>
  </nav>
);

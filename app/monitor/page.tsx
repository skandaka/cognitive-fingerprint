'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Disable SSR for this component to avoid config issues
const MonitorContent = dynamic(() => import('./MonitorContent'), { ssr: false });

export default function Monitor() {
  return <MonitorContent />;
}

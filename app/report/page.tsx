'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Disable SSR for this component to avoid config issues
const ReportContent = dynamic(() => import('./ReportContent'), { ssr: false });

export default function ReportPage() {
  return <ReportContent />;
}

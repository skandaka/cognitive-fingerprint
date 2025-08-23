import React from 'react';
import dynamic from 'next/dynamic';

// Load the fully interactive dashboard only on the client to avoid any SSR hydration divergence.
const Dashboard = dynamic(() => import('../src/visualization/Dashboard'), {
  ssr: false,
  loading: () => <div className="p-6 text-sm text-gray-400">Initializing cognitive dashboard…</div>
});

export default function Home(){
  return <Dashboard />;
}

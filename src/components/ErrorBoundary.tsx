import React, { useState } from 'react';
export const ErrorBoundary: React.FC<{children: any}> = ({ children }) => {
  const [err, setErr] = useState<any>(null);
  try {
    if (err) throw err;
    return children;
  } catch(e:any) {
    if (!err) setErr(e);
    return <div className="p-4 text-sm bg-red-900/20 border border-red-500/30 rounded">Component error – degraded mode.<br/>Details: {String(e)}</div>;
  }
};

import React from 'react';
import Dashboard from '../../src/visualization/Dashboard';
import { ReportExporter } from '../../src/components/ReportExporter';
import { CognitiveProvider } from '../../src/state/GlobalState';

export default function ReportContent(){
  return (
    <CognitiveProvider>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Diagnostic Report Preview</h1>
        <p className="text-sm text-gray-400">Export a shareable PDF containing current biomarker signature and heuristic risk scores.</p>
        <ReportExporter />
        <div className="text-[11px] text-gray-500 max-w-prose">Sensitivity, specificity, PPV, NPV, and AUC metrics displayed in the live demo reflect cross-validated performance on synthetic + literature-informed datasets (illustrative). Confidence intervals are shown where available.</div>
      </div>
    </CognitiveProvider>
  );
}
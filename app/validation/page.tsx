import React from 'react';

export default function ValidationPage(){
  return (
    <div className="p-8 space-y-8" aria-label="Validation Metrics">
      <h1 className="text-2xl font-semibold">Clinical Validation (Synthetic)</h1>
      <p className="text-sm text-gray-400 max-w-2xl">Demonstrative metrics generated from synthetic / proxy datasets to illustrate planned validation reporting (not real clinical outcomes).</p>
      <div className="grid md:grid-cols-3 gap-6">
        <MetricCard title="AUC" value="0.96" note="Composite" />
        <MetricCard title="Sensitivity" value="94%" note="@ 15% FPR" />
        <MetricCard title="Specificity" value="91%" note="Threshold tuned" />
        <MetricCard title="PPV" value="89%" note="Prevalence 10%" />
        <MetricCard title="NPV" value="95%" note="Prevalence 10%" />
        <MetricCard title="Calibration" value="0.93" note="ECE (lower better)" />
      </div>
      <div className="bg-neuro-surface rounded-xl p-6 shadow text-sm">
        <h2 className="font-semibold mb-4 text-lg">Confusion Matrix (Demo)</h2>
        <ConfusionMatrix tp={188} fp={22} fn={12} tn={178} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, note }:{title:string; value:string; note:string; }){
  return (
    <div className="bg-neuro-surface rounded-xl p-4 shadow text-sm flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-gray-400">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-gray-500 text-xs">{note}</div>
    </div>
  );
}

function ConfusionMatrix({ tp, fp, fn, tn }:{ tp:number; fp:number; fn:number; tn:number; }){
  const total = tp+fp+fn+tn;
  return (
    <div className="inline-block">
      <table className="border-collapse">
        <thead className="text-xs text-gray-400">
          <tr>
            <th className="p-2"></th>
            <th className="p-2">Pred +</th>
            <th className="p-2">Pred -</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 text-xs text-gray-400">Actual +</td>
            <td className="p-2 bg-green-600/30">{tp}</td>
            <td className="p-2 bg-red-600/30">{fn}</td>
          </tr>
          <tr>
            <td className="p-2 text-xs text-gray-400">Actual -</td>
            <td className="p-2 bg-yellow-600/30">{fp}</td>
            <td className="p-2 bg-green-700/30">{tn}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400 max-w-xs">
        <div>Accuracy: {(((tp+tn)/total)*100).toFixed(1)}%</div>
        <div>F1: {((2*tp)/(2*tp+fp+fn)).toFixed(2)}</div>
        <div>Precision: {(tp/(tp+fp)).toFixed(2)}</div>
        <div>Recall: {(tp/(tp+fn)).toFixed(2)}</div>
      </div>
    </div>
  );
}

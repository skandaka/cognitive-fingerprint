import React from 'react';
import { useCognitive } from '../state/GlobalState';
import { buildInsights } from '../interpretation/PlainLanguage';

export const ReportExporter = () => {
  const cognitive = useCognitive();
  const { exportData } = cognitive;
  function clinicianSummary(){
    const insights = buildInsights(cognitive.similarity, cognitive.drift);
    const lines: string[] = [];
    lines.push('=== Clinician Summary (Non-Diagnostic) ===');
    if (cognitive.baseline) {
      lines.push(`Baseline Confidence: ${(cognitive.baseline.statistics.confidence*100).toFixed(1)}%`);
      lines.push(`Baseline Stability: ${(cognitive.baseline.statistics.stability*100).toFixed(1)}%`);
    }
    if (cognitive.similarity) {
      lines.push(`Current Similarity: ${(cognitive.similarity.overall*100).toFixed(1)}% (confidence ${(cognitive.similarity.confidence*100).toFixed(1)}%)`);
    }
    if (cognitive.drift) {
      lines.push(`Active Drift: ${cognitive.drift.driftType} severity ${cognitive.drift.driftSeverity} magnitude ${(cognitive.drift.driftMagnitude*100).toFixed(1)}%`);
    }
    lines.push('Insights:');
    insights.forEach(i=> lines.push(` - [${i.level}] ${i.title}: ${i.message}`));
    lines.push('Note: This summary is generated for pattern context only and is not a diagnosis.');
    return lines.join('\n');
  }
  function exportPDF(){
    import('jspdf').then(mod => {
      const { jsPDF } = mod as any;
      const doc = new jsPDF();
      const data = exportData? exportData(): '{}';
      const clinician = clinicianSummary();
      doc.setFontSize(14);
      doc.text('Cognitive Fingerprint Demo Report', 14, 18);
      doc.setFontSize(10);
      const linesA = doc.splitTextToSize(clinician, 180);
      doc.text(linesA, 14, 28);
      doc.addPage();
      const linesB = doc.splitTextToSize(data, 180);
      doc.text(linesB, 14, 18);
      doc.save('cognitive_report.pdf');
    }).catch(()=>{});
  }
  return (
    <div className="text-xs space-y-2">
      <button onClick={exportPDF} className="px-3 py-1 rounded bg-neuro-accent/20 hover:bg-neuro-accent/30">Export PDF Report</button>
      <pre className="max-h-40 overflow-auto bg-black/30 p-2 rounded text-[10px]" aria-label="Clinician Summary Preview">{clinicianSummary()}</pre>
    </div>
  );
};

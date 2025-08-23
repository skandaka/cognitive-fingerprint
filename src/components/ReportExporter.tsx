import React from 'react';
import { useCognitive } from '../state/GlobalState';

export const ReportExporter = () => {
  const { exportData } = useCognitive();
  function exportPDF(){
    import('jspdf').then(mod => {
      const { jsPDF } = mod as any;
      const doc = new jsPDF();
      const data = exportData? exportData(): '{}';
      doc.setFontSize(14);
      doc.text('Cognitive Fingerprint Demo Report', 14, 18);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(data, 180);
      doc.text(lines, 14, 28);
      doc.save('cognitive_report.pdf');
    }).catch(()=>{});
  }
  return (
    <div className="text-xs space-y-2">
      <button onClick={exportPDF} className="px-3 py-1 rounded bg-neuro-accent/20 hover:bg-neuro-accent/30">Export PDF Report</button>
    </div>
  );
};

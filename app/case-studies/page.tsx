import React from 'react';

interface CaseStudy { id:string; name:string; condition:string; narrative:string; trajectory:number[]; }

const studies: CaseStudy[] = [
  { id:'pd1', name:'Case A', condition:'Early Parkinson\'s', narrative:'Subtle bradykinesia and emerging tremor captured via increased dwell variance and tremor index.', trajectory:[0.12,0.14,0.18,0.25,0.33,0.40] },
  { id:'ad1', name:'Case B', condition:'Prodromal Alzheimer\'s', narrative:'Semantic drift and reduced typing entropy preceded memory complaints.', trajectory:[0.10,0.11,0.13,0.17,0.22,0.30] },
  { id:'ms1', name:'Case C', condition:'Relapsing MS', narrative:'Motor slowing episodic; eye saccade rate spikes during relapse window.', trajectory:[0.15,0.28,0.19,0.27,0.21,0.24] }
];

export default function CaseStudiesPage(){
  return (
    <div className="p-8 space-y-8" aria-label="Clinical Case Studies">
      <h1 className="text-2xl font-semibold">Clinical Case Studies (Synthetic)</h1>
      <p className="text-sm text-gray-400 max-w-2xl">Synthetic illustrative trajectories demonstrating how multimodal digital biomarkers can surface early signals across distinct neurodegenerative profiles. Not real patient data.</p>
      <div className="grid md:grid-cols-3 gap-6">
        {studies.map(s=> <CaseCard key={s.id} study={s} />)}
      </div>
    </div>
  );
}

function CaseCard({ study }:any){
  return (
    <div className="bg-neuro-surface rounded-xl p-4 shadow-lg text-sm flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-lg">{study.name}</h2>
        <div className="text-neuro-accent text-xs uppercase tracking-wide">{study.condition}</div>
      </div>
      <p className="text-gray-400 leading-snug flex-1">{study.narrative}</p>
      <Trajectory series={study.trajectory} />
    </div>
  );
}

function Trajectory({ series }:{ series:number[] }){
  const max = Math.max(...series);
  return (
    <svg width={180} height={70} className="self-center" aria-label="Risk trajectory">
      {series.map((v,i)=>{
        const x = (i/(series.length-1))*170 + 5;
        const y = 65 - (v/max)*55;
        return <circle key={i} cx={x} cy={y} r={4} fill="#60a5fa" />;
      })}
      <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={series.map((v,i)=>{
        const x = (i/(series.length-1))*170 + 5;
        const y = 65 - (v/max)*55;
        return `${x},${y}`;
      }).join(' ')} />
    </svg>
  );
}

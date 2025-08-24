import React from 'react';
import { CognitiveProvider, useCognitive } from '../../src/state/GlobalState';

function ConfidenceTrend({ history }: { history: any[]|undefined }) {
  const values = (history||[]).slice(-40).map(h=> h.overall ?? h.risk ?? h.confidence ?? 0);
  if (!values.length) return <div className="h-8 flex items-center text-[10px] text-gray-500">No data</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v:number)=> max===min?50: ((v-min)/(max-min))*100;
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8">
      <polyline fill="none" stroke="#6EE7B7" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" points={values.map((v,i)=> `${(i/(values.length-1))*100},${30 - norm(v)*0.25}`).join(' ')} />
    </svg>
  );
}

function DriftSparkline({ driftHistory }: { driftHistory: any[]|undefined }) {
  const mags = (driftHistory||[]).slice(-30).map(d=> d.driftMagnitude || 0);
  if (!mags.length) return <div className="h-8 flex items-center text-[10px] text-gray-500">No drift</div>;
  const max = Math.max(...mags, 0.001);
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8">
      {mags.map((m,i)=> {
        const h = (m/max)*28+2; // min height
        const x = (i/(mags.length))*100;
        return <rect key={i} x={x} y={30-h} width={100/mags.length - 1} height={h} fill="#A78BFA" rx={0.5} />;
      })}
    </svg>
  );
}

function MonitorInner(){
  const { keystrokeHistory, riskHistory, baseline, similarity, similarityHistory, confidenceHistory, confidenceAssessment, drift, driftHistory } = useCognitive();
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Live Monitoring</h1>
      {baseline && similarity && (
        <div className="bg-neuro-surface p-4 rounded-xl text-xs grid gap-4 md:grid-cols-4">
          <div>
            <h3 className="font-semibold mb-1 text-gray-300">Baseline Quality</h3>
            <div className="space-y-1">
              <div>Confidence: {(baseline.statistics.confidence*100).toFixed(1)}%</div>
              <div>Stability: {(baseline.statistics.stability*100).toFixed(1)}%</div>
              <div>Samples: {baseline.statistics.sampleCount}</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-1 text-gray-300">Similarity</h3>
            <div className="space-y-1">
              <div>Overall: {(similarity.overall*100).toFixed(1)}%</div>
              <div>Confidence: {(similarity.confidence*100).toFixed(1)}%</div>
              <div>Coverage: {(similarity.coverage*100).toFixed(1)}%</div>
            </div>
          </div>
          {confidenceAssessment && (
            <div>
              <h3 className="font-semibold mb-1 text-gray-300">Assessment</h3>
              <div className="space-y-1">
                <div>Overall: {(confidenceAssessment.overall*100).toFixed(1)}%</div>
                <div>Data Quality: {(confidenceAssessment.components.dataQuality.score*100).toFixed(0)}%</div>
                <div>Feature Coverage: {(confidenceAssessment.components.featureCoverage.score*100).toFixed(0)}%</div>
              </div>
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-1 text-gray-300">Trends</h3>
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400">Similarity Trend</div>
              <ConfidenceTrend history={(driftHistory||[]).map(d=>({ overall: 1-d.driftMagnitude }))} />
              <div className="text-[10px] text-gray-400 -mt-1">Drift Magnitude</div>
              <DriftSparkline driftHistory={driftHistory} />
            </div>
          </div>
        </div>
      )}
      {similarity && (
        <div className="bg-neuro-surface p-4 rounded-xl text-xs">
          <h2 className="font-semibold mb-2 text-gray-300">Recent Anomalies</h2>
          <div className="space-y-1 max-h-40 overflow-auto">
            {Object.entries(similarity.modalities).flatMap(([mod, m]: any)=> m.anomalies.map((a:any,i:number)=>(
              <div key={mod+ i} className="flex justify-between border-b border-white/5 py-1">
                <span className="pr-2 flex-1 truncate">{mod}:{a.feature}</span>
                <span className="w-24 text-right">Δ {(a.deviation*100).toFixed(1)}%</span>
                <span className="w-20 text-right text-gray-500">{a.severity}</span>
              </div>
            ))).slice(-30).reverse()}
            {Object.entries(similarity.modalities).every(([_,m]:any)=>!m.anomalies.length) && <div className="text-gray-500">No anomalies.</div>}
          </div>
        </div>
      )}
      {similarity && (
        <div className="bg-neuro-surface p-4 rounded-xl text-xs">
          <h2 className="font-semibold mb-2 text-gray-300">Top Feature Contributions</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {Object.entries(similarity.modalities).map(([mod, m]: any)=>{
              const contribs = [...m.contributions].sort((a:any,b:any)=> a.contribution - b.contribution).slice(0,5);
              return (
                <div key={mod} className="border border-white/5 rounded p-2 space-y-1">
                  <div className="font-semibold text-gray-300 text-[11px] uppercase tracking-wide">{mod}</div>
                  {contribs.map((c:any,i:number)=>(
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="truncate pr-2">{c.feature}</span>
                      <span className={c.contribution<0? 'text-red-400':'text-green-400'}>{(c.contribution*100).toFixed(1)}%</span>
                    </div>
                  ))}
                  {!contribs.length && <div className="text-gray-500 text-[10px]">No features.</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(drift || (driftHistory && driftHistory.length)) && (
        <div className="bg-neuro-surface p-4 rounded-xl text-xs">
          <h2 className="font-semibold mb-2 text-gray-300">Drift Detection</h2>
          {drift && (
            <div className="mb-3 p-2 rounded border border-purple-400/30 bg-purple-400/10">
              <div className="flex justify-between"><span className="font-semibold">Current</span><span>{new Date(drift.detectedAt).toLocaleTimeString()}</span></div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                <div>Type: {drift.driftType}</div>
                <div>Severity: {drift.driftSeverity}</div>
                <div>Confidence: {(drift.confidence*100).toFixed(0)}%</div>
                <div>Magnitude: {(drift.driftMagnitude*100).toFixed(1)}%</div>
                <div>Direction: {drift.driftDirection}</div>
                <div>Rate: {(drift.driftRate).toFixed(3)}/day</div>
              </div>
              {drift.recommendedActions.length>0 && <div className="mt-2 text-[10px] text-gray-400">Actions: {drift.recommendedActions.join(', ')}</div>}
            </div>
          )}
          <div className="max-h-40 overflow-auto space-y-1">
            {driftHistory?.slice(-25).reverse().map((d,i)=>(
              <div key={i} className="flex justify-between text-[10px] border-b border-white/5 py-1">
                <span className="truncate flex-1">{d.driftType} / {d.driftSeverity}</span>
                <span className="w-16 text-right">{(d.confidence*100).toFixed(0)}%</span>
                <span className="w-14 text-right">{(d.driftMagnitude*100).toFixed(1)}%</span>
                <span className="w-20 text-right">{new Date(d.detectedAt).toLocaleTimeString()}</span>
              </div>
            ))}
            {!driftHistory?.length && <div className="text-gray-500">No drift detected yet.</div>}
          </div>
        </div>
      )}
      <div className="bg-neuro-surface p-4 rounded-xl text-xs max-h-72 overflow-auto">
        <h2 className="font-semibold mb-2 text-gray-300">Recent Keystroke Summaries</h2>
        {keystrokeHistory?.slice(-20).reverse().map((k,i)=>(
          <div key={i} className="grid grid-cols-5 gap-2 border-b border-white/5 py-1">
            <div>Dwell μ {k.meanDwell.toFixed(1)}</div>
            <div>Flight μ {k.meanFlight.toFixed(1)}</div>
            <div>σ² {k.varianceDwell.toFixed(1)}</div>
            <div>Entropy {k.entropy.toFixed(2)}</div>
            <div>n={k.sample}</div>
          </div>
        ))}
      </div>
      <div className="bg-neuro-surface p-4 rounded-xl text-xs">
        <h2 className="font-semibold mb-2 text-gray-300">Risk History (Last {riskHistory?.length||0} points)</h2>
        <div className="flex items-end space-x-1 h-32">
          {riskHistory?.slice(-120).map((r,i)=>(
            <div key={i} className="w-1 bg-neuro-accent" style={{ height: `${(r.risk||0)*100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MonitorContent(){
  return <CognitiveProvider><MonitorInner /></CognitiveProvider>;
}
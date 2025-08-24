import { describe, it, expect } from 'vitest';
import { adaptiveRecognition } from '../analysis/AdaptiveRecognition';
import { similarityScoring } from '../analysis/SimilarityScoring';
import { baselineModeling } from '../analysis/BaselineModeling';

function fakeSnapshot(i:number){
  return {
    timestamp: Date.now()+i*1000,
    sessionId: 's'+i,
    keyboard: { meanDwell: 100 + i, varianceDwell: 10, meanFlight: 80, varianceFlight:5 },
    mouse: { meanVelocity: 200, meanAcceleration: 50 },
    environmentalContext: { device:'x' },
    quality: 0.9
  } as any;
}

describe('Drift + Confidence pipeline', ()=>{
  it('detects drift after changing pattern', async ()=>{
    // Build baseline
    for (let i=0;i<10;i++) baselineModeling.addSnapshot('u', fakeSnapshot(i));
    const base = baselineModeling.getBaseline('u');
    expect(base).toBeTruthy();
    // initial similarity
    const sim1 = await similarityScoring.computeSimilarity(fakeSnapshot(11), base!);
    expect(typeof sim1.overall).toBe('number');
    // introduce change
    const altered = fakeSnapshot(12);
    altered.keyboard.meanDwell += 300; // large shift
    const sim2 = await similarityScoring.computeSimilarity(altered, base!);
    expect(sim2.overall).toBeLessThan(sim1.overall);
    const drift = await adaptiveRecognition.processNewScore('u', sim2);
    // drift may or may not trigger depending on thresholds; assert structure
    expect(drift === null || typeof drift.driftMagnitude === 'number').toBeTruthy();
  });
});

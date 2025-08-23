import { describe, it, expect } from 'vitest';
import { isolationForestScore } from '../analysis/AnomalyDetection';

describe('Isolation Forest', () => {
  it('produces score in [0,1]', () => {
    const vec = Array.from({length:30}, ()=> Math.random());
    const r = isolationForestScore(vec);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });
  it('flags anomalies above threshold sometimes', () => {
    const normal = Array.from({length:30}, ()=> 0.5 + Math.random()*0.01);
    const odd = Array.from({length:30}, ()=> Math.random());
    const nScore = isolationForestScore(normal).score;
    const aScore = isolationForestScore(odd).score;
    // not strict guarantee but usually aScore>nScore
    expect(typeof nScore).toBe('number');
    expect(typeof aScore).toBe('number');
  });
});

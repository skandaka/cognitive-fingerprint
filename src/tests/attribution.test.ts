import { describe, it, expect } from 'vitest';
import { shapGroupAttribution } from '../analysis/Attribution';
import { CognitiveFingerprintModel } from '../analysis/PatternRecognition';

describe('Attribution', () => {
  it('returns four groups with contributions summing ~1', () => {
    const model = new CognitiveFingerprintModel();
    const features = {
      typing: new Array(47).fill(0.1),
      voice: new Array(13).fill(0.1),
      motor: new Array(23).fill(0.1),
      temporal: new Array(12).fill(0.1)
    } as any;
    const atts = shapGroupAttribution(model, features, 8);
    expect(atts.length).toBe(4);
    const sum = atts.reduce((s,a)=> s + Math.abs(a.contribution),0);
    expect(sum).toBeGreaterThan(0.9);
    expect(sum).toBeLessThan(1.1);
  });
});

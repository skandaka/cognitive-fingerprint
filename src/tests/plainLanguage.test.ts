import { describe, it, expect } from 'vitest';
import { buildInsights } from '../interpretation/PlainLanguage';

describe('Plain language insights', ()=>{
  it('returns collecting when no data', ()=>{
    const res = buildInsights(undefined, null);
    expect(res.some(r=> r.id==='collecting')).toBeTruthy();
  });
  it('maps high similarity to good', ()=>{
    const res = buildInsights({ overall:0.9, confidence:0.9, coverage:1, modalities:{}, timestamp:Date.now(), interpretations:[], contributions:[], version:'1' } as any, null);
    const sim = res.find(r=> r.id==='similarity');
    expect(sim?.level).toBe('good');
  });
});

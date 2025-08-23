import { describe, it, expect } from 'vitest';
import { addGaussianNoise, anonymizeVector, deriveKey, encryptJSON, decryptJSON } from '../api/privacy';

describe('privacy utils', () => {
  it('adds noise (variance increase)', () => {
    const base = 5;
    const samples = Array.from({length:200}, ()=> addGaussianNoise(base, 1));
    const mean = samples.reduce((s,v)=>s+v,0)/samples.length;
    expect(Math.abs(mean-base)).toBeLessThan(1.5);
  });
  it('anonymizes vector length preserved', () => {
    const vec = [0,1,2,3];
    const noisy = anonymizeVector(vec, 0.5);
    expect(noisy).toHaveLength(vec.length);
    expect(noisy.some((v,i)=> v!==vec[i])).toBe(true);
  });
  it('encrypts and decrypts JSON', async () => {
    const key = await deriveKey('pass');
    const obj = { a: 1, b: 'test' };
    const enc = await encryptJSON(obj, key);
    const dec = await decryptJSON(enc, key);
    expect(dec).toEqual(obj);
  });
});

// Differential privacy placeholder utilities
export function addGaussianNoise(value: number, epsilon = 1.0, sensitivity = 1.0) {
  // Basic Gaussian mechanism (not production-grade); placeholder for concept
  const sigma = Math.sqrt(2 * Math.log(1.25 / 1e-5)) * sensitivity / epsilon;
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return value + sigma * randStdNormal;
}

export function anonymizeVector(vec: number[], epsilon = 1.0) {
  return vec.map(v => addGaussianNoise(v, epsilon));
}

// Simple AES-GCM encryption for at-rest local persistence (demo only; key mgmt omitted)
export async function encryptJSON(data: any, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return btoa(JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) }));
}

export async function decryptJSON(payload: string, key: CryptoKey): Promise<any> {
  const { iv, data } = JSON.parse(atob(payload));
  const cipherBytes = new Uint8Array(data);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, cipherBytes);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(plain)));
}

export async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(passphrase);
  const keyMat = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits','deriveKey']);
  const salt = new TextEncoder().encode('cog-fingerprint-demo');
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 50000, hash: 'SHA-256' }, keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}

export async function hashJSON(data: any): Promise<string> {
  const enc = new TextEncoder().encode(JSON.stringify(data));
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b=> b.toString(16).padStart(2,'0')).join('');
}

export async function deriveBaselineFingerprint(keystrokeBaseline: any, voice?: any, motor?: any){
  // Only include stable summary stats
  const payload = { k:{ md: keystrokeBaseline?.meanDwell, mf: keystrokeBaseline?.meanFlight, vd: keystrokeBaseline?.varianceDwell, e: keystrokeBaseline?.entropy }, v: voice? { f0: voice.f0, j: voice.jitter, s: voice.shimmer }: undefined, m: motor? { v: motor.velocityMean, a: motor.accelerationMean }: undefined };
  return hashJSON(payload);
}

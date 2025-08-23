export type Condition = 'parkinsons' | 'alzheimers' | 'ms' | 'als';

export interface BaselinePattern {
  typingSpeed: number; // chars/sec
  dwellMean: number;
  flightMean: number;
  voicePitchVar: number;
  correctionRate: number;
}

export function simulateNeurologicalDecline(baseline: BaselinePattern, condition: Condition, years: number) {
  const prog = sigmoid(years/10);
  const variation = (f:number)=> f * (1 + (Math.random()-0.5)*0.1);
  switch (condition) {
    case 'parkinsons':
      return {
        ...baseline,
        dwellMean: variation(baseline.dwellMean * (1 + 0.25 * prog)),
        flightMean: variation(baseline.flightMean * (1 + 0.15 * prog)),
        voicePitchVar: variation(baseline.voicePitchVar * (1 - 0.3 * prog)),
        correctionRate: variation(baseline.correctionRate * (1 + 0.4 * prog))
      };
    case 'alzheimers':
      return {
        ...baseline,
        typingSpeed: variation(baseline.typingSpeed * (1 - 0.3 * prog)),
        correctionRate: variation(baseline.correctionRate * (1 + 0.5 * prog))
      };
    case 'ms':
      return {
        ...baseline,
        typingSpeed: variation(baseline.typingSpeed * (1 - 0.2 * prog)),
        dwellMean: variation(baseline.dwellMean * (1 + 0.15 * prog))
      };
    case 'als':
      return {
        ...baseline,
        typingSpeed: variation(baseline.typingSpeed * (1 - 0.35 * prog)),
        dwellMean: variation(baseline.dwellMean * (1 + 0.1 * prog)),
        correctionRate: variation(baseline.correctionRate * (1 + 0.2 * prog))
      };
  }
}

function sigmoid(x:number){
  return 1 / (1 + Math.exp(-12*(x-0.5)));
}

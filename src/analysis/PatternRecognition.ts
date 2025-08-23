import * as tf from '@tensorflow/tfjs';

export interface MultiModalFeatures {
  typing: number[]; // 47 features
  voice: number[]; // 13
  motor: number[]; // 23
  temporal: number[]; // 12
}

export interface RiskScores {
  parkinsons: number;
  alzheimers: number;
  ms: number;
  overall: number;
  confidence: number;
}

export class CognitiveFingerprintModel {
  private model?: tf.LayersModel;

  async load(modelUrl: string) {
    this.model = await tf.loadLayersModel(modelUrl);
  }

  infer(features: MultiModalFeatures): RiskScores {
    if (!this.model) {
      // fallback heuristic (mock) for early dev
      const base = features.typing[0] || 0.1;
      return {
        parkinsons: Math.min(1, base * 0.3 + Math.random()*0.05),
        alzheimers: Math.min(1, base * 0.25 + Math.random()*0.05),
        ms: Math.min(1, base * 0.2 + Math.random()*0.05),
        overall: base,
        confidence: 0.85 + Math.random()*0.1
      };
    }
    const input = tf.tensor([[
      ...features.typing.slice(0,47),
      ...features.voice.slice(0,13),
      ...features.motor.slice(0,23),
      ...features.temporal.slice(0,12)
    ]]);
    const output = this.model.predict(input) as tf.Tensor;
    const arr = output.dataSync();
    return {
      parkinsons: arr[0],
      alzheimers: arr[1],
      ms: arr[2],
      overall: arr[3] ?? (arr[0]+arr[1]+arr[2])/3,
      confidence: 0.9 // placeholder
    };
  }
}

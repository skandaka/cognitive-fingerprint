import { describe, it, expect } from 'vitest';
import { similarityScoring } from '../analysis/SimilarityScoring';
import { baselineModeling } from '../analysis/BaselineModeling';

describe('SimilarityScoring basic', () => {
  it('produces score object with required fields', async () => {
    // Create synthetic baseline
    const user = 'testUser';
    // fabricate internal snapshots via baselineModeling (bypass private by simulating addSnapshot)
    for (let i=0;i<25;i++) {
      baselineModeling.addSnapshot(user, {
        timestamp: Date.now()+i,
        sessionId: 's'+i,
        keyboard: { meanDwell: 120+Math.random()*10, typingRhythm: 0.6+Math.random()*0.05 },
        mouse: { meanVelocity: 300+Math.random()*20 },
  scroll: { meanScrollVelocity: 200+Math.random()*10 },
        focus: { focusRatio: 0.7+Math.random()*0.05 },
        composite: { globalTimingEntropy: 0.4+Math.random()*0.02 },
        environmentalContext: {},
        quality: 0.8
      });
    }
  // Force baseline creation
  const baseline = baselineModeling.getBaseline(user) || await baselineModeling.createInitialBaseline(user);
    expect(baseline).not.toBeNull();
    const snapshot = {
      timestamp: Date.now(),
      sessionId: 'live',
      keyboard: { meanDwell: 125, typingRhythm: 0.62 },
      mouse: { meanVelocity: 310 },
  scroll: { meanScrollVelocity: 205 },
      focus: { focusRatio: 0.72 },
      composite: { globalTimingEntropy: 0.41 },
      environmentalContext: {},
      quality: 0.85
    } as any;
    const score = await similarityScoring.computeSimilarity(snapshot, baseline!);
    expect(typeof score.overall).toBe('number');
    expect(score.modalities.keyboard).toBeDefined();
    expect(score.interpretation.overallAssessment).toBeTruthy();
  });
});
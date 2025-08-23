# Cognitive Fingerprint Mapping System (Hackathon Build)

Multimodal digital biomarker platform for early signal detection across neurodegenerative disorders (Parkinson's, Alzheimer's, MS, ALS). This build focuses on rapid demonstration value: rich UI, streaming collectors, heuristic analytics, and explainability panels.

## Features Implemented
- Keystroke dynamics (dwell, flight, variance, entropy, corrections)
- Mouse / motor tracking (velocity, acceleration, tremor index)
- Voice acoustics (pitch, jitter, shimmer, HNR, MFCCs)
- Eye tracking (WebGazer fallback or mouse proxy) with fixation stability, saccade, blink, microsaccade rate, confidence
- 3D brain heatmap (region intensity placeholders)
- Synthetic progression Time Machine & degradation simulator
- Anomaly detection (enhanced Isolation Forest implementation)
- Heuristic risk model (placeholder TF.js interface)
- Baseline calibration wizard & alert center
- PDF clinical-style report & JSON data export / wipe (privacy)
- ROC metrics & feature importance + SHAP-style group attribution (demo)
- Case studies (synthetic trajectories)
- PWA + offline service worker + Dockerfile
- Accessibility improvements (skip link, roles)

## Getting Started
Install Node 18+ (required). Then:
```bash
npm install
npm run dev
```
Open http://localhost:3000.

If using Docker:
```bash
docker build -t cognitive-fingerprint .
docker run -p 3000:3000 cognitive-fingerprint
```

## Privacy & Compliance (Prototype)
- All processing client-side (demo claim) – voice not uploaded.
- Export/Wipe controls provided.
- Differential privacy Gaussian noise toggle + AES-GCM encrypted local persistence

## Roadmap (Next)
- Real model training & bundling
- Proper isolation forest & LSTM temporal modeling
- Enhanced voice: formants, pause ratio, phonation time, HNR refinement
- True gaze tracking (WebGazer / Eye Tracking API when available)
- Per-feature SHAP / Integrated Gradients attribution
- Advanced DP calibration wizard & epsilon budgeting
- Stronger key management & user-managed secrets
- Clinical validation dataset integration & metrics dashboard
- Full accessibility audit & WCAG contrast corrections

## Disclaimer
Not a medical device. Not for clinical decision-making.# Cognitive Fingerprint Mapping System

Early detection prototype for neurodegenerative disorders using passive multi‑modal digital interaction biomarkers. (Hackathon build – Not a medical device.)

## Features Implemented (MVP)
- Real-time keystroke collection with dwell/flight metrics & entropy
- Multi-modal feature placeholder + risk scoring scaffold
- Synthetic progression simulator & demo scenarios
- React + Next.js dashboard with:
  - Typing rhythm waveform
  - 3D brain wireframe (placeholder for heatmap)
  - Risk gauge visualization
  - Progression timeline mock
- Differential privacy + anomaly detection placeholders (to implement)
- Medical references dataset placeholder

## Quick Start
```bash
npm install
npm run dev
```
Visit http://localhost:3000

## Architecture (Planned)
```
collectors/ -> Passive data capture (keystroke, voice, mouse, eye)
analysis/   -> ML inference, anomaly detection, temporal modeling
visualization/ -> React/Three/D3 components
api/        -> Privacy layer & export endpoints
models/     -> TensorFlow.js models
```

## Disclaimers
Not a diagnostic tool. For research & educational demonstration only. Consult a qualified healthcare professional for medical advice.

## Roadmap (Hackathon 48h)
1. Hook real keystroke stream to waveform & feature extraction
2. Implement audio capture + MFCC extraction (Meyda) & tremor metrics
3. Mouse movement tracker & tremor frequency spectral peak detection
4. Isolation Forest implementation (fast JS version) + LSTM temporal trend (TF.js)
5. Brain heatmap (region mapping of feature attribution)
6. Demo Time Machine (synthetic progression slider)
7. Exportable PDF clinical-style report + ROC metrics mock
8. Add privacy: differential noise + local-only raw data, hashed signature export

## License
Proprietary (Hackathon use).

## Hackathon Pitch Highlights
- Full client-side multi-modal capture (typing, mouse, voice, gaze) with live risk & anomaly scoring.
- Privacy-first: DP noise toggle, encrypted persistence, immediate wipe & export, hashed baseline fingerprint.
- Explainability: group + per-feature attribution, timeline, synthetic progression, PDF export.
- Accessibility: semantic landmarks, skip link, contrast toggle, keyboard focus outlines.
- Extensible ML scaffold (LSTM stub, Isolation Forest, TF.js integration ready for real model drop-in).

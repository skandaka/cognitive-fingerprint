import { KeystrokeCollector, KeystrokeAnalyticsSummary } from '../collectors/KeystrokeCollector';
import { MouseTracker, MouseMetrics } from '../collectors/MouseTracker';
import { VoiceAnalyzer, VoiceFeatures } from '../collectors/VoiceAnalyzer';
import { EyeTracker, EyeFeatures } from '../collectors/EyeTracker';
import { config } from '../config/AppConfig';
import { createComponentLogger } from '../utils/Logger';

export type SessionState =
  | 'idle'
  | 'collecting'
  | 'paused'
  | 'stabilizing'
  | 'stopped';

export type EventType = 'keystroke' | 'mouse' | 'voice' | 'eye' | 'visibility' | 'focus' | 'idle';

export interface CaptureEvent {
  type: EventType;
  timestamp: number;
  sessionId: string;
  data: any;
  quality: number; // 0-1 confidence/quality score
  discarded?: boolean; // marked for discard due to quality gates
}

export interface SessionMetrics {
  startTime: number;
  totalDuration: number;
  activeDuration: number;
  hiddenDuration: number;
  idleDuration: number;
  activeTimeRatio: number;
  eventCounts: Record<EventType, number>;
  qualityScore: number;
}

export interface CaptureState {
  sessionState: SessionState;
  sessionId: string;
  metrics: SessionMetrics;
  isVisible: boolean;
  hasFocus: boolean;
  lastActivity: number;
  warmupRemaining: number;
  stabilizationStarted?: number;
}

type StateChangeListener = (state: CaptureState) => void;
type EventListener = (event: CaptureEvent) => void;

export class EventCaptureManager {
  private static instance: EventCaptureManager;

  private keystrokeCollector: KeystrokeCollector;
  private mouseTracker: MouseTracker;
  private voiceAnalyzer: VoiceAnalyzer;
  private eyeTracker: EyeTracker;

  private state: CaptureState;
  private logger = createComponentLogger('EventCaptureManager');

  private stateListeners = new Set<StateChangeListener>();
  private eventListeners = new Set<EventListener>();

  private visibilityHandler?: () => void;
  private focusHandlers: Array<() => void> = [];
  private idleTimer?: NodeJS.Timeout;
  private stabilizationTimer?: NodeJS.Timeout;
  private eventBuffer: CaptureEvent[] = [];

  private warmupDurationMs = 5000; // 5 second warmup period
  private idleThresholdMs = 30000; // 30 seconds before idle
  private stabilizationDurationMs = 2000; // 2 second stabilization period
  private maxBufferSize = 10000;

  private constructor() {
    this.initializeCollectors();
    this.initializeState();
    this.setupVisibilityHandling();
    this.setupFocusHandling();
    this.setupIdleDetection();
  }

  static getInstance(): EventCaptureManager {
    if (!EventCaptureManager.instance) {
      EventCaptureManager.instance = new EventCaptureManager();
    }
    return EventCaptureManager.instance;
  }

  private initializeCollectors(): void {
    this.keystrokeCollector = new KeystrokeCollector();
    this.mouseTracker = new MouseTracker();
    this.voiceAnalyzer = new VoiceAnalyzer();
    this.eyeTracker = new EyeTracker();

    // Set up event forwarding
    this.keystrokeCollector.onSummary(this.handleKeystrokeEvent.bind(this));
    this.mouseTracker.onMetrics(this.handleMouseEvent.bind(this));
    this.voiceAnalyzer.onFeatures(this.handleVoiceEvent.bind(this));
    this.eyeTracker.onFeatures(this.handleEyeEvent.bind(this));
  }

  private initializeState(): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    this.state = {
      sessionState: 'idle',
      sessionId,
      isVisible: !document.hidden,
      hasFocus: document.hasFocus(),
      lastActivity: now,
      warmupRemaining: this.warmupDurationMs,
      metrics: {
        startTime: now,
        totalDuration: 0,
        activeDuration: 0,
        hiddenDuration: 0,
        idleDuration: 0,
        activeTimeRatio: 0,
        eventCounts: {
          keystroke: 0,
          mouse: 0,
          voice: 0,
          eye: 0,
          visibility: 0,
          focus: 0,
          idle: 0
        },
        qualityScore: 0
      }
    };

    this.logger.info('EventCaptureManager initialized', {
      sessionId,
      warmupDuration: this.warmupDurationMs,
      idleThreshold: this.idleThresholdMs
    });
  }

  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;

    this.visibilityHandler = () => {
      const isVisible = !document.hidden;
      const wasVisible = this.state.isVisible;

      if (isVisible !== wasVisible) {
        this.state.isVisible = isVisible;
        this.emitEvent({
          type: 'visibility',
          timestamp: Date.now(),
          sessionId: this.state.sessionId,
          data: { isVisible, wasVisible },
          quality: 1.0
        });

        if (isVisible && wasVisible === false) {
          this.logger.info('Tab became visible');
          // Don't change collection state - continue background collection
        } else if (!isVisible) {
          this.logger.info('Tab hidden - continuing background collection');
          // Don't pause - allow background collection to continue
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupFocusHandling(): void {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (!this.state.hasFocus) {
        this.state.hasFocus = true;
        this.emitEvent({
          type: 'focus',
          timestamp: Date.now(),
          sessionId: this.state.sessionId,
          data: { hasFocus: true },
          quality: 1.0
        });
        this.logger.debug('Window gained focus');
      }
    };

    const handleBlur = () => {
      if (this.state.hasFocus) {
        this.state.hasFocus = false;
        this.emitEvent({
          type: 'focus',
          timestamp: Date.now(),
          sessionId: this.state.sessionId,
          data: { hasFocus: false },
          quality: 1.0
        });
        this.logger.debug('Window lost focus');
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    this.focusHandlers = [
      () => window.removeEventListener('focus', handleFocus),
      () => window.removeEventListener('blur', handleBlur)
    ];
  }

  private setupIdleDetection(): void {
    const resetIdleTimer = () => {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }

      this.state.lastActivity = Date.now();

      this.idleTimer = setTimeout(() => {
        this.emitEvent({
          type: 'idle',
          timestamp: Date.now(),
          sessionId: this.state.sessionId,
          data: { idleDuration: this.idleThresholdMs },
          quality: 1.0
        });

        if (this.state.sessionState === 'collecting') {
          this.logger.info('User idle detected, pausing collection');
          this.transitionToState('paused');
        }
      }, this.idleThresholdMs);
    };

    // Reset idle timer on any user activity
    if (typeof window !== 'undefined') {
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, true);
      });
    }

    resetIdleTimer(); // Initialize timer
  }

  private handleKeystrokeEvent(summary: KeystrokeAnalyticsSummary): void {
    if (this.state.sessionState === 'stopped' || this.state.sessionState === 'idle') return;

    const quality = this.calculateKeystrokeQuality(summary);
    const event: CaptureEvent = {
      type: 'keystroke',
      timestamp: Date.now(),
      sessionId: this.state.sessionId,
      data: summary,
      quality,
      discarded: quality < 0.3 || this.state.warmupRemaining > 0
    };

    this.emitEvent(event);
    this.state.metrics.eventCounts.keystroke++;
  }

  private handleMouseEvent(metrics: MouseMetrics): void {
    if (this.state.sessionState === 'stopped' || this.state.sessionState === 'idle') return;

    const quality = this.calculateMouseQuality(metrics);
    const event: CaptureEvent = {
      type: 'mouse',
      timestamp: Date.now(),
      sessionId: this.state.sessionId,
      data: metrics,
      quality,
      discarded: quality < 0.3 || this.state.warmupRemaining > 0
    };

    this.emitEvent(event);
    this.state.metrics.eventCounts.mouse++;
  }

  private handleVoiceEvent(features: VoiceFeatures): void {
    if (this.state.sessionState === 'stopped' || this.state.sessionState === 'idle') return;

    const quality = features.voiceQuality || 0.5;
    const event: CaptureEvent = {
      type: 'voice',
      timestamp: Date.now(),
      sessionId: this.state.sessionId,
      data: features,
      quality,
      discarded: quality < 0.4 || this.state.warmupRemaining > 0
    };

    this.emitEvent(event);
    this.state.metrics.eventCounts.voice++;
  }

  private handleEyeEvent(features: EyeFeatures): void {
    if (this.state.sessionState === 'stopped' || this.state.sessionState === 'idle') return;

    const quality = 0.7; // Default quality for eye tracking
    const event: CaptureEvent = {
      type: 'eye',
      timestamp: Date.now(),
      sessionId: this.state.sessionId,
      data: features,
      quality,
      discarded: quality < 0.5 || this.state.warmupRemaining > 0
    };

    this.emitEvent(event);
    this.state.metrics.eventCounts.eye++;
  }

  private calculateKeystrokeQuality(summary: KeystrokeAnalyticsSummary): number {
    let quality = 0.8; // Base quality

    // Reduce quality for unusual patterns that might indicate errors
    if (summary.meanDwell < 20 || summary.meanDwell > 1000) quality *= 0.7;
    if (summary.meanFlight < 10 || summary.meanFlight > 2000) quality *= 0.7;
    if (summary.varianceDwell > summary.meanDwell * 3) quality *= 0.8;
    if (summary.sample < 5) quality *= 0.5; // Very low sample size

    // Boost quality for consistent patterns
    if (summary.sample > 20) quality = Math.min(1.0, quality * 1.1);
    if (summary.entropy > 2) quality = Math.min(1.0, quality * 1.05);

    return Math.max(0, Math.min(1, quality));
  }

  private calculateMouseQuality(metrics: MouseMetrics): number {
    let quality = 0.7; // Base quality

    // Check for reasonable velocity ranges
    if (metrics.velocityMean > 50 && metrics.velocityMean < 2000) quality *= 1.1;
    if (metrics.sample > 10) quality = Math.min(1.0, quality * 1.1);

    // Reduce quality for suspicious patterns
    if (metrics.velocityMean > 5000) quality *= 0.3; // Too fast, likely synthetic
    if (metrics.sample < 3) quality *= 0.4; // Too few samples

    return Math.max(0, Math.min(1, quality));
  }

  private transitionToState(newState: SessionState): void {
    const oldState = this.state.sessionState;
    if (oldState === newState) return;

    this.logger.info('Session state transition', { from: oldState, to: newState });
    this.state.sessionState = newState;

    // Handle state-specific logic
    switch (newState) {
      case 'collecting':
        this.startCollectors();
        this.resetWarmupTimer();
        break;
      case 'paused':
        // Keep collectors running but mark events as discarded
        break;
      case 'stabilizing':
        this.startStabilizationTimer();
        break;
      case 'stopped':
        this.stopCollectors();
        break;
      case 'idle':
        // Reduced collection rate, keep basic monitoring
        break;
    }

    this.updateMetrics();
    this.notifyStateListeners();
  }

  private startCollectors(): void {
    const appConfig = config.get();

    this.keystrokeCollector.start();
    this.mouseTracker.start();

    if (appConfig.collectors.voice.enabled) {
      this.voiceAnalyzer.start().catch(error => {
        this.logger.warn('Voice analyzer failed to start', { error: error.message });
      });
    }

    if (appConfig.collectors.eye.enabled) {
      this.eyeTracker.start();
    }
  }

  private stopCollectors(): void {
    this.keystrokeCollector.stop();
    this.mouseTracker.stop();
    this.voiceAnalyzer.stop();
    this.eyeTracker.stop();
  }

  private resetWarmupTimer(): void {
    this.state.warmupRemaining = this.warmupDurationMs;

    const warmupTimer = setInterval(() => {
      this.state.warmupRemaining = Math.max(0, this.state.warmupRemaining - 100);

      if (this.state.warmupRemaining <= 0) {
        clearInterval(warmupTimer);
        this.logger.info('Warmup period completed, events now being recorded');
      }
    }, 100);
  }

  private startStabilizationTimer(): void {
    if (this.stabilizationTimer) {
      clearTimeout(this.stabilizationTimer);
    }

    this.state.stabilizationStarted = Date.now();

    this.stabilizationTimer = setTimeout(() => {
      this.logger.info('Stabilization period completed');
      this.transitionToState('collecting');
    }, this.stabilizationDurationMs);
  }

  private updateMetrics(): void {
    const now = Date.now();
    this.state.metrics.totalDuration = now - this.state.metrics.startTime;

    // Calculate active time ratio based on visibility and focus
    if (this.state.isVisible && this.state.hasFocus && this.state.sessionState === 'collecting') {
      // Currently active
    } else {
      // Update hidden/idle durations
    }

    // Calculate overall quality score
    const totalEvents = Object.values(this.state.metrics.eventCounts).reduce((sum, count) => sum + count, 0);
    if (totalEvents > 0) {
      const qualitySum = this.eventBuffer
        .filter(e => !e.discarded)
        .reduce((sum, e) => sum + e.quality, 0);
      this.state.metrics.qualityScore = qualitySum / totalEvents;
    }

    // Update active time ratio
    if (this.state.metrics.totalDuration > 0) {
      this.state.metrics.activeTimeRatio = this.state.metrics.activeDuration / this.state.metrics.totalDuration;
    }
  }

  private emitEvent(event: CaptureEvent): void {
    // Add to buffer
    this.eventBuffer.push(event);

    // Trim buffer if too large
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }

    // Notify listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.logger.error('Event listener error', { error: error.message });
      }
    });
  }

  private notifyStateListeners(): void {
    this.stateListeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        this.logger.error('State listener error', { error: error.message });
      }
    });
  }

  // Public API
  public start(): void {
    this.logger.info('Starting event capture');
    this.transitionToState('stabilizing');
  }

  public stop(): void {
    this.logger.info('Stopping event capture');
    this.transitionToState('stopped');
  }

  public pause(): void {
    this.logger.info('Pausing event capture');
    this.transitionToState('paused');
  }

  public resume(): void {
    this.logger.info('Resuming event capture');
    this.transitionToState('collecting');
  }

  public getState(): CaptureState {
    this.updateMetrics();
    return { ...this.state };
  }

  public getEvents(since?: number, types?: EventType[]): CaptureEvent[] {
    let filtered = this.eventBuffer;

    if (since) {
      filtered = filtered.filter(e => e.timestamp >= since);
    }

    if (types && types.length > 0) {
      filtered = filtered.filter(e => types.includes(e.type));
    }

    return filtered.slice(); // Return copy
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public clearBuffer(): void {
    this.eventBuffer = [];
    this.logger.info('Event buffer cleared');
  }

  public destroy(): void {
    this.stop();

    // Clean up event listeners
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    this.focusHandlers.forEach(cleanup => cleanup());

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.stabilizationTimer) {
      clearTimeout(this.stabilizationTimer);
    }

    this.logger.info('EventCaptureManager destroyed');
  }
}

// Singleton instance export
export const eventCaptureManager = EventCaptureManager.getInstance();
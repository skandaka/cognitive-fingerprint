import { z } from 'zod';

const FeatureFamilyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  weight: z.number().min(0).max(1).default(1.0),
  privacyLevel: z.enum(['standard', 'enhanced', 'disabled']).default('standard')
});

const CollectorConfigSchema = z.object({
  keystroke: z.object({
    batchSize: z.number().min(1).max(1000).default(50),
    historyLimit: z.number().min(100).max(10000).default(300),
    tremorFreqMin: z.number().min(1).max(10).default(4),
    tremorFreqMax: z.number().min(1).max(10).default(6),
    dwellTimeThreshold: z.number().min(10).max(500).default(50)
  }).default({}),

  mouse: z.object({
    sampleRate: z.number().min(10).max(1000).default(100),
    velocityThreshold: z.number().min(1).max(1000).default(500),
    tremorWindow: z.number().min(100).max(5000).default(1000)
  }).default({}),

  voice: z.object({
    enabled: z.boolean().default(true),
    sampleRate: z.number().min(8000).max(48000).default(16000),
    analysisWindow: z.number().min(512).max(4096).default(1024),
    minRecordingTime: z.number().min(1000).max(30000).default(5000)
  }).default({}),

  eye: z.object({
    enabled: z.boolean().default(false),
    calibrationPoints: z.number().min(5).max(13).default(9),
    confidenceThreshold: z.number().min(0.1).max(1.0).default(0.7),
    gazeSmoothingFactor: z.number().min(0.1).max(1.0).default(0.8)
  }).default({})
});

const BaselineConfigSchema = z.object({
  minDurationMs: z.number().min(30000).max(900000).default(120000), // 2 minutes default
  minEventCount: z.number().min(50).max(10000).default(200),
  stabilityThreshold: z.number().min(0.01).max(0.5).default(0.1),
  confidenceThreshold: z.number().min(0.5).max(0.95).default(0.8),
  activeTimeRatio: z.number().min(0.3).max(1.0).default(0.7),
  maxHiddenTimeMs: z.number().min(5000).max(60000).default(15000),
  autoExtendEnabled: z.boolean().default(true),
  versioning: z.boolean().default(true)
});

const ScoringConfigSchema = z.object({
  updateIntervalMs: z.number().min(1000).max(10000).default(3000),
  normalizationMethod: z.enum(['zscore', 'minmax', 'robust']).default('zscore'),
  varianceFloor: z.number().min(0.001).max(1.0).default(0.01),
  inconclusiveThreshold: z.number().min(0.1).max(0.9).default(0.3),
  anomalyThreshold: z.number().min(0.5).max(0.95).default(0.65),
  treeCount: z.number().min(10).max(200).default(50),
  subSampleSize: z.number().min(32).max(256).default(64)
});

const PrivacyConfigSchema = z.object({
  dataMinimization: z.boolean().default(true),
  rawDataRetentionMs: z.number().min(0).max(86400000).default(3600000), // 1 hour
  aggregatedRetentionMs: z.number().min(86400000).max(2592000000).default(604800000), // 1 week
  differentialPrivacy: z.object({
    enabled: z.boolean().default(false),
    epsilon: z.number().min(0.1).max(10.0).default(1.0),
    delta: z.number().min(1e-10).max(1e-3).default(1e-5)
  }).default({}),
  consentRequired: z.boolean().default(true),
  encryptLocalStorage: z.boolean().default(true),
  fingerprintSalt: z.string().min(16).default('default-salt-change-me'),
  allowExport: z.boolean().default(true),
  allowWipe: z.boolean().default(true)
});

const PerformanceConfigSchema = z.object({
  maxMemoryMB: z.number().min(10).max(1000).default(100),
  gcThresholdMB: z.number().min(5).max(500).default(50),
  performanceMonitoring: z.boolean().default(true),
  backpressureEnabled: z.boolean().default(true),
  eventDropThreshold: z.number().min(0.5).max(0.95).default(0.8),
  frameRateCap: z.number().min(10).max(120).default(60)
});

const UIConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto', 'high-contrast']).default('dark'),
  reducedMotion: z.boolean().default(false),
  tooltipsEnabled: z.boolean().default(true),
  advancedFeaturesVisible: z.boolean().default(false),
  sparklinePoints: z.number().min(10).max(200).default(50),
  updateFrequencyMs: z.number().min(100).max(5000).default(500)
});

export const AppConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  features: z.record(z.string(), FeatureFamilyConfigSchema).default({}),
  collectors: CollectorConfigSchema.default({}),
  baseline: BaselineConfigSchema.default({}),
  scoring: ScoringConfigSchema.default({}),
  privacy: PrivacyConfigSchema.default({}),
  performance: PerformanceConfigSchema.default({}),
  ui: UIConfigSchema.default({}),
  flags: z.object({
    enableAdvanced: z.boolean().default(true),
    enableAI: z.boolean().default(false),
    enableAssistant: z.boolean().default(false)
  }).default({}),
  debug: z.object({
    enableConsoleLogging: z.boolean().default(false),
    logLevel: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    performanceOverlay: z.boolean().default(false)
  }).default({})
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;
  private listeners: Set<(config: AppConfig) => void> = new Set();

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): AppConfig {
    const defaults = AppConfigSchema.parse({});

    if (typeof window === 'undefined') {
      return defaults;
    }

    try {
      const stored = localStorage.getItem('cognitive-fingerprint-config');
      if (stored) {
        const parsed = JSON.parse(stored);
        return AppConfigSchema.parse({ ...defaults, ...parsed });
      }
    } catch (error) {
      console.warn('[ConfigService] Failed to load stored config, using defaults:', error);
    }

    return defaults;
  }

  private validateConfig(): void {
    try {
      AppConfigSchema.parse(this.config);
    } catch (error) {
      console.error('[ConfigService] Configuration validation failed:', error);
      throw new Error('Invalid configuration detected. Check AUDIT.md for guidance.');
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('cognitive-fingerprint-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[ConfigService] Failed to save configuration:', error);
    }
  }

  get(): AppConfig {
    return { ...this.config };
  }

  update(updates: Partial<AppConfig>): void {
    const newConfig = { ...this.config, ...updates };

    try {
      this.config = AppConfigSchema.parse(newConfig);
      this.saveConfig();
      this.notifyListeners();
    } catch (error) {
      console.error('[ConfigService] Failed to update configuration:', error);
      throw new Error('Configuration update validation failed');
    }
  }

  updatePath(path: string, value: any): void {
    const keys = path.split('.');
    const newConfig = { ...this.config };

    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current[key] = { ...current[key] };
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;

    try {
      this.config = AppConfigSchema.parse(newConfig);
      this.saveConfig();
      this.notifyListeners();
    } catch (error) {
      console.error('[ConfigService] Failed to update configuration path:', path, error);
      throw new Error(`Configuration update failed for path: ${path}`);
    }
  }

  getPath<T>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  reset(): void {
    this.config = AppConfigSchema.parse({});
    this.saveConfig();
    this.notifyListeners();
  }

  onChange(listener: (config: AppConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('[ConfigService] Listener error:', error);
      }
    });
  }

  validate(): { valid: boolean; errors: string[] } {
    try {
      AppConfigSchema.parse(this.config);
      return { valid: true, errors: [] };
    } catch (error) {
      const errors = error instanceof z.ZodError
        ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        : [error.message];
      return { valid: false, errors };
    }
  }

  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  import(configJson: string): void {
    try {
      const parsed = JSON.parse(configJson);
      const validated = AppConfigSchema.parse(parsed);
      this.config = validated;
      this.saveConfig();
      this.notifyListeners();
    } catch (error) {
      console.error('[ConfigService] Failed to import configuration:', error);
      throw new Error('Configuration import failed: invalid format or schema');
    }
  }
}

export const config = ConfigService.getInstance();
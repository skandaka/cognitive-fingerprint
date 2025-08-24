import { createComponentLogger } from '../utils/Logger';
import { config } from '../config/AppConfig';

export interface DeviceCharacteristics {
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelRatio: number;
    orientation?: string;
  };
  hardware: {
    hardwareConcurrency: number;
    deviceMemory?: number; // GB, if available
    maxTouchPoints: number;
  };
  browser: {
    userAgent: string;
    language: string;
    languages: string[];
    cookieEnabled: boolean;
    doNotTrack: string | null;
    vendor: string;
  };
  network: {
    connection?: {
      effectiveType: string;
      downlink: number;
      rtt: number;
      saveData: boolean;
    };
    onlineStatus: boolean;
  };
  timing: {
    timezone: string;
    timezoneOffset: number;
    performanceApiSupport: boolean;
  };
  capabilities: {
    webgl: boolean;
    webglVersion: string;
    canvas2d: boolean;
    webAudio: boolean;
    webRTC: boolean;
    serviceWorker: boolean;
    webAssembly: boolean;
    gamepad: boolean;
    vibration: boolean;
    webAuthn: boolean;
  };
}

export interface EnvironmentContext {
  sessionId: string;
  collectionTime: number;
  device: DeviceCharacteristics;
  contextHash: string; // Stable hash for environment matching
  privacyLevel: 'standard' | 'enhanced' | 'minimal';
  volatileFactors: {
    batteryLevel?: number;
    charging?: boolean;
    networkType?: string;
    cpuClass?: string;
  };
}

export class EnvironmentFingerprint {
  private static instance: EnvironmentFingerprint;
  private logger = createComponentLogger('EnvironmentFingerprint');
  private cachedFingerprint?: EnvironmentContext;
  private salt: string;

  private constructor() {
    const appConfig = config.get();
    this.salt = appConfig.privacy.fingerprintSalt;
  }

  static getInstance(): EnvironmentFingerprint {
    if (!EnvironmentFingerprint.instance) {
      EnvironmentFingerprint.instance = new EnvironmentFingerprint();
    }
    return EnvironmentFingerprint.instance;
  }

  public async generateFingerprint(sessionId: string, privacyLevel: 'standard' | 'enhanced' | 'minimal' = 'standard'): Promise<EnvironmentContext> {
    if (typeof window === 'undefined') {
      throw new Error('Environment fingerprinting requires browser environment');
    }

    const startTime = performance.now();
    this.logger.debug('Generating environment fingerprint', { sessionId, privacyLevel });

    const device = await this.collectDeviceCharacteristics(privacyLevel);
    const contextHash = await this.generateContextHash(device, privacyLevel);
    const volatileFactors = await this.collectVolatileFactors(privacyLevel);

    const fingerprint: EnvironmentContext = {
      sessionId,
      collectionTime: Date.now(),
      device,
      contextHash,
      privacyLevel,
      volatileFactors
    };

    const collectionTime = performance.now() - startTime;
    this.logger.info('Environment fingerprint generated', {
      sessionId,
      contextHash: contextHash.substring(0, 8) + '...',
      collectionTimeMs: collectionTime.toFixed(2),
      privacyLevel
    });

    this.cachedFingerprint = fingerprint;
    return fingerprint;
  }

  private async collectDeviceCharacteristics(privacyLevel: string): Promise<DeviceCharacteristics> {
    const screen = this.getScreenInfo(privacyLevel);
    const hardware = this.getHardwareInfo(privacyLevel);
    const browser = this.getBrowserInfo(privacyLevel);
    const network = await this.getNetworkInfo(privacyLevel);
    const timing = this.getTimingInfo(privacyLevel);
    const capabilities = await this.getCapabilities(privacyLevel);

    return {
      screen,
      hardware,
      browser,
      network,
      timing,
      capabilities
    };
  }

  private getScreenInfo(privacyLevel: string): DeviceCharacteristics['screen'] {
    if (privacyLevel === 'minimal') {
      return {
        width: Math.round(window.screen.width / 100) * 100, // Rounded to nearest 100
        height: Math.round(window.screen.height / 100) * 100,
        availWidth: Math.round(window.screen.availWidth / 100) * 100,
        availHeight: Math.round(window.screen.availHeight / 100) * 100,
        colorDepth: window.screen.colorDepth,
        pixelRatio: Math.round(window.devicePixelRatio || 1)
      };
    }

    const screen: DeviceCharacteristics['screen'] = {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1
    };

    // Add orientation if available and not minimal privacy
    if (privacyLevel !== 'enhanced' && 'orientation' in screen) {
      try {
        screen.orientation = (window.screen as any).orientation?.type || 'unknown';
      } catch (error) {
        // Ignore orientation errors
      }
    }

    return screen;
  }

  private getHardwareInfo(privacyLevel: string): DeviceCharacteristics['hardware'] {
    const hardware: DeviceCharacteristics['hardware'] = {
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };

    // Add device memory if available and privacy allows
    if (privacyLevel !== 'minimal' && 'deviceMemory' in navigator) {
      hardware.deviceMemory = (navigator as any).deviceMemory;
    }

    return hardware;
  }

  private getBrowserInfo(privacyLevel: string): DeviceCharacteristics['browser'] {
    let userAgent = navigator.userAgent;

    // Reduce user agent precision for enhanced privacy
    if (privacyLevel === 'enhanced') {
      // Keep only major browser and version info
      userAgent = userAgent.replace(/\d+\.\d+\.\d+/g, 'X.X.X');
    } else if (privacyLevel === 'minimal') {
      // Generic browser identification
      const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)/i);
      userAgent = browserMatch ? browserMatch[1] : 'Unknown';
    }

    return {
      userAgent,
      language: navigator.language,
      languages: privacyLevel === 'minimal' ? [navigator.language] : Array.from(navigator.languages),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      vendor: privacyLevel === 'minimal' ? '' : navigator.vendor
    };
  }

  private async getNetworkInfo(privacyLevel: string): Promise<DeviceCharacteristics['network']> {
    const network: DeviceCharacteristics['network'] = {
      onlineStatus: navigator.onLine
    };

    if (privacyLevel !== 'minimal' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        network.connection = {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        };
      }
    }

    return network;
  }

  private getTimingInfo(privacyLevel: string): DeviceCharacteristics['timing'] {
    const now = new Date();

    return {
      timezone: privacyLevel === 'minimal' ? 'UTC' : now.getTimezoneOffset().toString(),
      timezoneOffset: now.getTimezoneOffset(),
      performanceApiSupport: typeof performance !== 'undefined' && typeof performance.now === 'function'
    };
  }

  private async getCapabilities(privacyLevel: string): Promise<DeviceCharacteristics['capabilities']> {
    const capabilities: DeviceCharacteristics['capabilities'] = {
      canvas2d: this.testCanvas2D(),
      webgl: false,
      webglVersion: 'none',
      webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      webRTC: typeof RTCPeerConnection !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webAssembly: typeof WebAssembly !== 'undefined',
      gamepad: 'getGamepads' in navigator,
      vibration: 'vibrate' in navigator,
      webAuthn: typeof PublicKeyCredential !== 'undefined'
    };

    // Test WebGL capabilities
    if (privacyLevel !== 'minimal') {
      const webglInfo = this.testWebGL();
      capabilities.webgl = webglInfo.supported;
      capabilities.webglVersion = webglInfo.version;
    }

    return capabilities;
  }

  private testCanvas2D(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch (error) {
      return false;
    }
  }

  private testWebGL(): { supported: boolean; version: string } {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (gl && 'getParameter' in gl) {
        const webglContext = gl as WebGLRenderingContext;
        const version = webglContext.getParameter(webglContext.VERSION) || 'WebGL 1.0';
        return { supported: true, version };
      }

      // Test WebGL 2
      const gl2 = canvas.getContext('webgl2');
      if (gl2 && 'getParameter' in gl2) {
        return { supported: true, version: 'WebGL 2.0' };
      }

      return { supported: false, version: 'none' };
    } catch (error) {
      return { supported: false, version: 'none' };
    }
  }

  private async collectVolatileFactors(privacyLevel: string): Promise<EnvironmentContext['volatileFactors']> {
    const factors: EnvironmentContext['volatileFactors'] = {};

    if (privacyLevel === 'minimal') {
      return factors;
    }

    // Battery API (deprecated but still available in some browsers)
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        factors.batteryLevel = Math.round(battery.level * 100);
        factors.charging = battery.charging;
      } catch (error) {
        // Ignore battery API errors
      }
    }

    // Network connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.type) {
        factors.networkType = connection.type;
      }
    }

    // CPU class (legacy property, rarely available)
    if ((navigator as any).cpuClass) {
      factors.cpuClass = (navigator as any).cpuClass;
    }

    return factors;
  }

  private async generateContextHash(device: DeviceCharacteristics, privacyLevel: string): Promise<string> {
    // Create a stable hash from device characteristics
    // This hash should be consistent for the same environment but privacy-preserving

    const hashInput = {
      // Screen resolution (rounded for privacy)
      screen: `${Math.round(device.screen.width/50)*50}x${Math.round(device.screen.height/50)*50}`,
      // Hardware (generalized)
      cores: device.hardware.hardwareConcurrency,
      memory: device.hardware.deviceMemory ? Math.round(device.hardware.deviceMemory) : 0,
      // Browser (generalized)
      browserFamily: this.extractBrowserFamily(device.browser.userAgent),
      language: device.browser.language.split('-')[0], // Just language, not locale
      // Capabilities (boolean flags only)
      caps: Object.entries(device.capabilities)
        .filter(([_, supported]) => supported === true)
        .map(([name, _]) => name)
        .sort()
        .join(','),
      // Timezone (rounded)
      tz: Math.round(device.timing.timezoneOffset / 60) * 60
    };

    // Convert to string and add salt
    const hashString = JSON.stringify(hashInput) + this.salt;

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Return first 16 characters for manageable hash length
    return hashHex.substring(0, 16);
  }

  private extractBrowserFamily(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  public getCachedFingerprint(): EnvironmentContext | null {
    return this.cachedFingerprint || null;
  }

  public async isEnvironmentSimilar(otherHash: string, threshold = 0.9): Promise<boolean> {
    if (!this.cachedFingerprint) {
      return false;
    }

    // For now, use simple string comparison
    // In production, you might use fuzzy matching for similar environments
    return this.cachedFingerprint.contextHash === otherHash;
  }

  public validateEnvironmentStability(): { stable: boolean; reasons: string[] } {
    if (!this.cachedFingerprint) {
      return { stable: false, reasons: ['No cached fingerprint available'] };
    }

    const reasons: string[] = [];
    const device = this.cachedFingerprint.device;
    const volatile = this.cachedFingerprint.volatileFactors;

    // Check for potential instability indicators
    if (volatile.batteryLevel !== undefined && volatile.batteryLevel < 20) {
      reasons.push('Low battery may affect performance');
    }

    if (device.network.connection && device.network.connection.effectiveType === 'slow-2g') {
      reasons.push('Very slow network connection');
    }

    if (!device.network.onlineStatus) {
      reasons.push('Device is offline');
    }

    if (device.screen.width < 800 || device.screen.height < 600) {
      reasons.push('Very small screen size may affect interaction patterns');
    }

    return { stable: reasons.length === 0, reasons };
  }

  public exportFingerprint(): string | null {
    if (!this.cachedFingerprint) {
      return null;
    }

    // Export fingerprint without sensitive details
    const exportData = {
      contextHash: this.cachedFingerprint.contextHash,
      collectionTime: this.cachedFingerprint.collectionTime,
      privacyLevel: this.cachedFingerprint.privacyLevel,
      device: {
        screen: this.cachedFingerprint.device.screen,
        capabilities: this.cachedFingerprint.device.capabilities,
        // Exclude potentially sensitive browser details
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  public clearCachedFingerprint(): void {
    this.cachedFingerprint = undefined;
    this.logger.debug('Cached environment fingerprint cleared');
  }
}

export const environmentFingerprint = EnvironmentFingerprint.getInstance();
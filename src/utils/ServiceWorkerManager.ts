/**
 * ServiceWorkerManager - Handles communication with Service Worker for background processing
 */

import { createComponentLogger } from './Logger';
import { KeystrokeAnalyticsSummary } from '../collectors/KeystrokeCollector';

export interface BackgroundData {
  keystrokeCount: number;
  riskHistory: Array<{
    risk: number;
    confidence: number;
    timestamp: number;
    source: string;
    sampleCount: number;
    avgDwell: number;
    avgFlight: number;
  }>;
  lastProcessed: number;
  enabled: boolean;
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private logger = createComponentLogger('ServiceWorkerManager');
  private registration: ServiceWorkerRegistration | null = null;
  private isRegistered = false;

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      this.logger.warn('Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      this.isRegistered = true;
      
      this.logger.info('Service Worker registered', {
        scope: this.registration.scope,
        state: this.registration.active?.state
      });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      // Wait for SW to be active
      if (this.registration.installing) {
        await this.waitForServiceWorker(this.registration.installing);
      }

      // Enable background processing
      await this.enableBackgroundProcessing();

      return true;
    } catch (error) {
      this.logger.error('Service Worker registration failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  private async waitForServiceWorker(sw: ServiceWorker): Promise<void> {
    return new Promise((resolve) => {
      if (sw.state === 'activated') {
        resolve();
        return;
      }
      
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') {
          resolve();
        }
      });
    });
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'BACKGROUND_KEYSTROKE_UPDATE':
        this.logger.debug('Background update received', data);
        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('background-update', { detail: data }));
        break;
        
      default:
        this.logger.debug('Unknown SW message', { type, data });
    }
  }

  async sendKeystrokeData(keystrokeData: KeystrokeAnalyticsSummary): Promise<void> {
    if (!this.isRegistered || !navigator.serviceWorker.controller) {
      this.logger.warn('Service Worker not ready for keystroke data');
      return;
    }

    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_KEYSTROKE_DATA',
        data: keystrokeData
      });
      
      this.logger.debug('Sent keystroke data to SW', {
        samples: keystrokeData.sample,
        dwell: keystrokeData.meanDwell
      });
    } catch (error) {
      this.logger.error('Failed to send keystroke data', { error });
    }
  }

  async getBackgroundData(): Promise<BackgroundData | null> {
    if (!this.isRegistered || !navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'BACKGROUND_DATA_RESPONSE') {
          resolve(event.data.data);
        } else {
          reject(new Error('Unexpected response type'));
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_BACKGROUND_DATA' }, 
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  }

  async enableBackgroundProcessing(): Promise<void> {
    if (!this.isRegistered || !navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'ENABLE_BACKGROUND_PROCESSING'
    });

    this.logger.info('Background processing enabled in SW');
  }

  async disableBackgroundProcessing(): Promise<void> {
    if (!this.isRegistered || !navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'DISABLE_BACKGROUND_PROCESSING'
    });

    this.logger.info('Background processing disabled in SW');
  }

  getRegistrationState(): {
    isRegistered: boolean;
    isControlled: boolean;
    state?: string;
  } {
    return {
      isRegistered: this.isRegistered,
      isControlled: !!navigator.serviceWorker?.controller,
      state: this.registration?.active?.state
    };
  }

  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      this.isRegistered = false;
      this.registration = null;
      this.logger.info('Service Worker unregistered');
    }
  }
}

export const serviceWorkerManager = ServiceWorkerManager.getInstance();
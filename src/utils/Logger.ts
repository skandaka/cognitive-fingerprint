// Lazy-loaded to avoid SSR issues

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: LogContext;
  component?: string;
  userId?: string;
  sessionId?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

const SENSITIVE_KEYS = new Set([
  'password', 'passphrase', 'token', 'secret', 'key', 'auth',
  'keystroke', 'keypress', 'character', 'char', 'input',
  'voice', 'audio', 'sound', 'speech',
  'gaze', 'eye', 'pupil', 'fixation',
  'biometric', 'fingerprint', 'pattern'
]);

class LoggerService {
  private static instance: LoggerService;
  private sessionId: string;
  private buffer: LogEntry[] = [];
  private readonly maxBufferSize = 1000;
  private initialized = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeLogger();
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private initializeLogger(): void {
    if (this.initialized) return;

    this.info('Logger initialized', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });

    this.initialized = true;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    try {
      const { config } = require('../config/AppConfig');
      const currentConfig = config.get();
      const configLevel = currentConfig.debug.logLevel;
      return LOG_LEVELS[level] >= LOG_LEVELS[configLevel];
    } catch (error) {
      // Fallback if config not available (SSR)
      return level !== 'debug';
    }
  }

  private redactSensitiveData(obj: any, depth = 0): any {
    if (depth > 10) return '[MAX_DEPTH_REACHED]';

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitiveData(item, depth + 1));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactSensitiveData(value, depth + 1);
      } else if (typeof value === 'string' && value.length > 100) {
        redacted[key] = `[STRING_TRUNCATED:${value.length}_CHARS]`;
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext, component?: string): string {
    const timestamp = new Date().toISOString();
    const componentStr = component ? `[${component}]` : '[APP]';
    const contextStr = context ? ` ${JSON.stringify(this.redactSensitiveData(context))}` : '';

    return `${timestamp} ${level.toUpperCase()} ${componentStr} ${message}${contextStr}`;
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, component?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context: context ? this.redactSensitiveData(context) : undefined,
      component,
      sessionId: this.sessionId
    };

    this.addToBuffer(entry);

    try {
      const { config } = require('../config/AppConfig');
      const currentConfig = config.get();
      const enableConsole = currentConfig.debug.enableConsoleLogging;
      if (enableConsole || level === 'error' || level === 'fatal') {
        const formattedMessage = this.formatMessage(level, message, context, component);

        switch (level) {
          case 'debug':
          case 'info':
            // eslint-disable-next-line no-console
            console.log(formattedMessage);
            break;
          case 'warn':
            console.warn(formattedMessage);
            break;
          case 'error':
          case 'fatal':
            console.error(formattedMessage);
            break;
        }
      }
    } catch (error) {
      // Fallback console logging if config unavailable
      if (level === 'error' || level === 'fatal') {
        console.error(`[${level.toUpperCase()}] ${message}`, context);
      }
    }

    if (level === 'error' || level === 'fatal') {
      this.persistCriticalLog(entry);
    }
  }

  private persistCriticalLog(entry: LogEntry): void {
    if (typeof window === 'undefined') return;

    try {
      const existingLogs = localStorage.getItem('cognitive-fingerprint-critical-logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(entry);

      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      localStorage.setItem('cognitive-fingerprint-critical-logs', JSON.stringify(logs));
    } catch (error) {
      console.error('[Logger] Failed to persist critical log:', error);
    }
  }

  debug(message: string, context?: LogContext, component?: string): void {
    this.log('debug', message, context, component);
  }

  info(message: string, context?: LogContext, component?: string): void {
    this.log('info', message, context, component);
  }

  warn(message: string, context?: LogContext, component?: string): void {
    this.log('warn', message, context, component);
  }

  error(message: string, context?: LogContext, component?: string): void {
    this.log('error', message, context, component);
  }

  fatal(message: string, context?: LogContext, component?: string): void {
    this.log('fatal', message, context, component);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getLogs(level?: LogLevel, component?: string, limit = 100): LogEntry[] {
    let filtered = this.buffer;

    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }

    if (component) {
      filtered = filtered.filter(entry => entry.component === component);
    }

    return filtered.slice(-limit);
  }

  getLogsSince(timestamp: number): LogEntry[] {
    return this.buffer.filter(entry => entry.timestamp >= timestamp);
  }

  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      exportTimestamp: Date.now(),
      logs: this.buffer
    };
    return JSON.stringify(exportData, null, 2);
  }

  clearLogs(): void {
    this.buffer = [];
    this.info('Log buffer cleared');
  }

  clearCriticalLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cognitive-fingerprint-critical-logs');
    }
  }

  getLogStats(): { total: number; byLevel: Record<LogLevel, number>; oldestTimestamp: number; newestTimestamp: number } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    };

    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    let newestTimestamp = 0;

    this.buffer.forEach(entry => {
      byLevel[entry.level]++;
      if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
      if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
    });

    return {
      total: this.buffer.length,
      byLevel,
      oldestTimestamp: oldestTimestamp === Number.MAX_SAFE_INTEGER ? 0 : oldestTimestamp,
      newestTimestamp
    };
  }

  setLogLevel(level: LogLevel): void {
    try {
      const { config } = require('../config/AppConfig');
      config.updatePath('debug.logLevel', level);
      this.info('Log level changed', { newLevel: level });
    } catch (error) {
      console.warn('Could not update log level configuration');
    }
  }

  enableConsoleLogging(enabled: boolean): void {
    try {
      const { config } = require('../config/AppConfig');
      config.updatePath('debug.enableConsoleLogging', enabled);
      this.info('Console logging changed', { enabled });
    } catch (error) {
      console.warn('Could not update console logging configuration');
    }
  }
}

export const logger = LoggerService.getInstance();

export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, context?: LogContext) => logger.debug(message, context, componentName),
    info: (message: string, context?: LogContext) => logger.info(message, context, componentName),
    warn: (message: string, context?: LogContext) => logger.warn(message, context, componentName),
    error: (message: string, context?: LogContext) => logger.error(message, context, componentName),
    fatal: (message: string, context?: LogContext) => logger.fatal(message, context, componentName)
  };
}
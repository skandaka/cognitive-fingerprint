// Comprehensive Error Handling and Validation System
// Production-grade error handling with medical safety considerations

export type ErrorCategory =
  | 'data_collection'
  | 'processing'
  | 'validation'
  | 'system'
  | 'network'
  | 'permissions'
  | 'medical_safety';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CognitiveError {
  id: string;
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details: any;
  stack?: string;
  context: {
    component: string;
    operation: string;
    userId?: string;
    sessionId: string;
  };
  recoveryAction?: string;
  userMessage?: string;
  medicalRisk: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: CognitiveError[];
  warnings: CognitiveError[];
  passed: string[];
  confidence: number;
}

export class CognitiveErrorHandler {
  private errors: CognitiveError[] = [];
  private errorObservers: ((error: CognitiveError) => void)[] = [];
  private sessionId: string;
  private maxErrorHistory = 1000;
  private criticalErrorThreshold = 5; // Max critical errors before safety shutdown

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandling();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      // Catch unhandled errors
      window.onerror = (message, source, lineno, colno, error) => {
        this.handleError(error || new Error(message as string), {
          component: 'global',
          operation: 'unhandled_error',
          sessionId: this.sessionId
        }, 'system');
        return false;
      };

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(new Error(event.reason), {
          component: 'global',
          operation: 'unhandled_promise',
          sessionId: this.sessionId
        }, 'system');
      });
    }
  }

  /**
   * Handle and categorize errors with medical safety considerations
   */
  handleError(
    error: Error | string,
    context: { component: string; operation: string; userId?: string; sessionId?: string },
    category: ErrorCategory = 'system',
    severity?: ErrorSeverity
  ): CognitiveError {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorId = this.generateErrorId();

    // Auto-determine severity if not provided
    const determinedSeverity = severity || this.determineSeverity(errorObj, category);

    const cognitiveError: CognitiveError = {
      id: errorId,
      timestamp: performance.now(),
      category,
      severity: determinedSeverity,
      message: errorObj.message,
      details: this.extractErrorDetails(errorObj),
      stack: errorObj.stack,
      context: {
        ...context,
        sessionId: context.sessionId || this.sessionId
      },
      recoveryAction: this.determineRecoveryAction(errorObj, category),
      userMessage: this.generateUserMessage(errorObj, category, determinedSeverity),
      medicalRisk: this.assessMedicalRisk(errorObj, category)
    };

    // Store error
    this.errors.push(cognitiveError);
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.shift();
    }

    // Notify observers
    this.notifyObservers(cognitiveError);

    // Take immediate action for critical errors
    if (determinedSeverity === 'critical') {
      this.handleCriticalError(cognitiveError);
    }

    // Log appropriately
    this.logError(cognitiveError);

    return cognitiveError;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Medical safety errors are always high or critical
    if (category === 'medical_safety') {
      return error.message.includes('false positive') ? 'high' : 'critical';
    }

    // Permission errors affecting core functionality
    if (category === 'permissions' &&
        (error.message.includes('microphone') || error.message.includes('camera'))) {
      return 'high';
    }

    // Data collection errors
    if (category === 'data_collection') {
      if (error.message.includes('calibration')) return 'high';
      return 'medium';
    }

    // Processing errors
    if (category === 'processing') {
      if (error.message.includes('timeout') || error.message.includes('memory')) {
        return 'high';
      }
      return 'medium';
    }

    // Network errors are usually low severity (privacy-first design)
    if (category === 'network') {
      return 'low';
    }

    // System errors
    if (category === 'system') {
      if (error.name === 'TypeError' || error.name === 'ReferenceError') {
        return 'high';
      }
      return 'medium';
    }

    return 'medium';
  }

  private extractErrorDetails(error: Error): any {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5), // Limit stack trace
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
  }

  private determineRecoveryAction(error: Error, category: ErrorCategory): string {
    switch (category) {
      case 'data_collection':
        if (error.message.includes('microphone')) {
          return 'Request microphone permission again';
        }
        if (error.message.includes('keyboard')) {
          return 'Reset keystroke collector';
        }
        return 'Reinitialize data collection';

      case 'processing':
        if (error.message.includes('memory')) {
          return 'Clear processing queue and restart analysis';
        }
        return 'Restart processing pipeline';

      case 'permissions':
        return 'Guide user to grant necessary permissions';

      case 'medical_safety':
        return 'Stop analysis and show safety message';

      case 'network':
        return 'Continue in offline mode';

      default:
        return 'Refresh application';
    }
  }

  private generateUserMessage(error: Error, category: ErrorCategory, severity: ErrorSeverity): string {
    // Never show technical details to users - always user-friendly messages

    if (category === 'medical_safety') {
      return 'Analysis paused for safety reasons. Please consult a healthcare professional for any medical concerns.';
    }

    if (category === 'permissions') {
      if (error.message.includes('microphone')) {
        return 'Microphone access is needed for voice analysis. Please grant permission when prompted.';
      }
      return 'Additional permissions are needed for full functionality.';
    }

    if (category === 'data_collection') {
      return 'Having trouble collecting data. The system will automatically retry.';
    }

    if (category === 'processing') {
      if (severity === 'critical') {
        return 'System temporarily unavailable. Please try again in a few moments.';
      }
      return 'Processing delayed. Your data is safe and analysis will continue.';
    }

    if (category === 'network') {
      return 'Network connectivity issue. Operating in offline mode.';
    }

    // Generic message for system errors
    return 'A minor issue occurred. The system is working to resolve it automatically.';
  }

  private assessMedicalRisk(error: Error, category: ErrorCategory): boolean {
    // Determine if this error could impact medical safety

    if (category === 'medical_safety') return true;

    // False positive risk
    if (error.message.includes('false positive') ||
        error.message.includes('incorrect diagnosis') ||
        error.message.includes('medical accuracy')) {
      return true;
    }

    // Data integrity issues that could affect medical analysis
    if (category === 'data_collection' &&
        (error.message.includes('corrupted') || error.message.includes('invalid baseline'))) {
      return true;
    }

    // Validation failures for medical thresholds
    if (category === 'validation' &&
        error.message.includes('medical threshold')) {
      return true;
    }

    return false;
  }

  private handleCriticalError(error: CognitiveError): void {
    console.error('CRITICAL ERROR:', error);

    // Count recent critical errors
    const recentCriticalErrors = this.errors.filter(
      e => e.severity === 'critical' &&
           e.timestamp > performance.now() - 60000 // Last minute
    ).length;

    if (recentCriticalErrors >= this.criticalErrorThreshold) {
      console.error('SAFETY SHUTDOWN: Too many critical errors');
      this.initiateSafetyShutdown();
    }

    // For medical safety errors, immediate action
    if (error.medicalRisk) {
      console.error('MEDICAL SAFETY ERROR:', error.message);
      // Stop all analysis
      // Show safety message to user
    }
  }

  private initiateSafetyShutdown(): void {
    // Stop all data collection
    // Clear all processing queues
    // Show safety message
    // Log shutdown reason

    const shutdownError: CognitiveError = {
      id: this.generateErrorId(),
      timestamp: performance.now(),
      category: 'medical_safety',
      severity: 'critical',
      message: 'System initiated safety shutdown due to multiple critical errors',
      details: { criticalErrorCount: this.criticalErrorThreshold },
      context: {
        component: 'error_handler',
        operation: 'safety_shutdown',
        sessionId: this.sessionId
      },
      recoveryAction: 'Restart application',
      userMessage: 'System temporarily unavailable for safety reasons. Please restart the application.',
      medicalRisk: true
    };

    this.logError(shutdownError);
    // Emit shutdown event
    window.dispatchEvent(new CustomEvent('cognitive-safety-shutdown', { detail: shutdownError }));
  }

  private logError(error: CognitiveError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.category.toUpperCase()}] ${error.message}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(logMessage, error);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(logMessage, error);
    }

    // Send to external monitoring if configured
    this.sendToMonitoring(error);
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'log';
    }
  }

  private sendToMonitoring(error: CognitiveError): void {
    // In production, send to monitoring service
    // For now, just log locally

    // Only send non-sensitive information
    const sanitizedError = {
      id: error.id,
      timestamp: error.timestamp,
      category: error.category,
      severity: error.severity,
      message: error.message,
      component: error.context.component,
      operation: error.context.operation,
      medicalRisk: error.medicalRisk
    };

    // Store for batch upload (respecting privacy)
    localStorage.setItem(
      `cognitive_error_${error.id}`,
      JSON.stringify(sanitizedError)
    );
  }

  private notifyObservers(error: CognitiveError): void {
    this.errorObservers.forEach(observer => {
      try {
        observer(error);
      } catch (e) {
        console.error('Error in error observer:', e);
      }
    });
  }

  /**
   * Data validation with medical safety checks
   */
  validateData(
    data: any,
    component: string,
    validationRules: { [key: string]: (value: any) => boolean }
  ): ValidationResult {
    const errors: CognitiveError[] = [];
    const warnings: CognitiveError[] = [];
    const passed: string[] = [];

    for (const [field, validator] of Object.entries(validationRules)) {
      try {
        if (data.hasOwnProperty(field)) {
          if (validator(data[field])) {
            passed.push(field);
          } else {
            const error = this.handleError(
              new Error(`Validation failed for ${field}: ${JSON.stringify(data[field])}`),
              { component, operation: 'validation', sessionId: this.sessionId },
              'validation',
              'medium'
            );
            errors.push(error);
          }
        } else {
          const error = this.handleError(
            new Error(`Required field missing: ${field}`),
            { component, operation: 'validation', sessionId: this.sessionId },
            'validation',
            'high'
          );
          errors.push(error);
        }
      } catch (e) {
        const error = this.handleError(
          e as Error,
          { component, operation: 'validation', sessionId: this.sessionId },
          'validation',
          'high'
        );
        errors.push(error);
      }
    }

    const confidence = passed.length / (passed.length + errors.length + warnings.length);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      passed,
      confidence
    };
  }

  /**
   * Medical threshold validation
   */
  validateMedicalThresholds(
    biomarkers: any,
    thresholds: any,
    condition: string
  ): ValidationResult {
    const validationRules = {
      // Keystroke validations
      dwellTime: (value: number) => value >= 0 && value <= 1000, // 0-1000ms reasonable
      tremor: (value: number) => value >= 0 && value <= 20,      // 0-20Hz range

      // Voice validations
      jitter: (value: number) => value >= 0 && value <= 10,      // 0-10% range
      shimmer: (value: number) => value >= 0 && value <= 20,     // 0-20% range
      hnr: (value: number) => value >= -10 && value <= 40,       // -10 to 40dB range

      // Confidence validations
      confidence: (value: number) => value >= 0 && value <= 1    // 0-1 range
    };

    const result = this.validateData(biomarkers, 'medical_validator', validationRules);

    // Additional medical safety checks
    if (biomarkers.confidence > 0.95) {
      const warning = this.handleError(
        new Error(`Unusually high confidence (${biomarkers.confidence}) - verify results`),
        { component: 'medical_validator', operation: 'threshold_check', sessionId: this.sessionId },
        'medical_safety',
        'medium'
      );
      result.warnings.push(warning);
    }

    // Check for impossible biomarker combinations
    if (biomarkers.jitter > 5 && biomarkers.hnr > 25) {
      const error = this.handleError(
        new Error('Impossible biomarker combination detected - high jitter with high HNR'),
        { component: 'medical_validator', operation: 'combination_check', sessionId: this.sessionId },
        'medical_safety',
        'high'
      );
      result.errors.push(error);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: CognitiveError) => void): void {
    this.errorObservers.push(callback);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: { [key in ErrorCategory]: number };
    bySeverity: { [key in ErrorSeverity]: number };
    medicalRisk: number;
    recentCritical: number;
  } {
    const stats = {
      total: this.errors.length,
      byCategory: {} as { [key in ErrorCategory]: number },
      bySeverity: {} as { [key in ErrorSeverity]: number },
      medicalRisk: 0,
      recentCritical: 0
    };

    // Initialize counters
    const categories: ErrorCategory[] = ['data_collection', 'processing', 'validation', 'system', 'network', 'permissions', 'medical_safety'];
    const severities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical'];

    categories.forEach(cat => stats.byCategory[cat] = 0);
    severities.forEach(sev => stats.bySeverity[sev] = 0);

    // Count errors
    const now = performance.now();
    this.errors.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;

      if (error.medicalRisk) {
        stats.medicalRisk++;
      }

      if (error.severity === 'critical' && error.timestamp > now - 300000) { // Last 5 minutes
        stats.recentCritical++;
      }
    });

    return stats;
  }

  /**
   * Export error report for debugging
   */
  exportErrorReport(): {
    sessionId: string;
    timestamp: string;
    stats: ReturnType<typeof this.getErrorStats>;
    recentErrors: CognitiveError[];
    systemInfo: any;
  } {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      stats: this.getErrorStats(),
      recentErrors: this.errors.slice(-20), // Last 20 errors
      systemInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: performance.now(),
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    };
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
  }
}

// Singleton instance
export const cognitiveErrorHandler = new CognitiveErrorHandler();
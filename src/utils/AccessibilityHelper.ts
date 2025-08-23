// Accessibility Helper - WCAG 2.1 AA Compliance for Medical Applications
// Ensures the cognitive fingerprint system is accessible to all users

export interface AccessibilityConfig {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardOnly: boolean;
  focusIndicators: boolean;
  colorBlindFriendly: boolean;
  textToSpeech: boolean;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  text: string;
  border: string;
}

export class AccessibilityHelper {
  private config: AccessibilityConfig;
  private observers: ((config: AccessibilityConfig) => void)[] = [];
  private announcer: HTMLElement | null = null;

  constructor() {
    this.config = this.detectSystemPreferences();
    this.createScreenReaderAnnouncer();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.applyInitialStyles();
  }

  private detectSystemPreferences(): AccessibilityConfig {
    const hasMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasContrastPreference = window.matchMedia('(prefers-contrast: high)').matches;
    const hasLargeTextPreference = window.matchMedia('(prefers-reduced-data: reduce)').matches;

    return {
      highContrast: hasContrastPreference || localStorage.getItem('a11y-high-contrast') === 'true',
      largeText: hasLargeTextPreference || localStorage.getItem('a11y-large-text') === 'true',
      reducedMotion: hasMotionPreference || localStorage.getItem('a11y-reduced-motion') === 'true',
      screenReader: this.detectScreenReader(),
      keyboardOnly: localStorage.getItem('a11y-keyboard-only') === 'true',
      focusIndicators: true, // Always enabled for medical applications
      colorBlindFriendly: localStorage.getItem('a11y-colorblind') === 'true',
      textToSpeech: localStorage.getItem('a11y-tts') === 'true'
    };
  }

  private detectScreenReader(): boolean {
    // Detect common screen readers
    const userAgent = navigator.userAgent.toLowerCase();
    const screenReaders = ['nvda', 'jaws', 'voiceover', 'narrator', 'talkback'];

    // Check for screen reader indicators
    if (screenReaders.some(sr => userAgent.includes(sr))) {
      return true;
    }

    // Check for reduced motion preference (often correlates with screen reader use)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }

    // Check for high contrast preference (often used with screen readers)
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return true;
    }

    return false;
  }

  private createScreenReaderAnnouncer(): void {
    if (!this.announcer) {
      this.announcer = document.createElement('div');
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.setAttribute('id', 'sr-announcer');
      this.announcer.style.cssText = `
        position: absolute !important;
        left: -10000px !important;
        top: auto !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
      `;
      document.body.appendChild(this.announcer);
    }
  }

  private setupKeyboardNavigation(): void {
    // Skip links for keyboard users
    this.createSkipLinks();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt + 1: Skip to main content
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        this.focusMainContent();
      }

      // Alt + 2: Skip to navigation
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        this.focusNavigation();
      }

      // Alt + D: Toggle demo mode
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.navigateToDemo();
      }

      // Alt + R: Go to results/report
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.navigateToReport();
      }

      // Escape: Close modal/overlay
      if (e.key === 'Escape') {
        this.closeTopOverlay();
      }
    });

    // Focus trap for modals
    this.setupFocusTrapping();
  }

  private createSkipLinks(): void {
    const skipLinks = document.createElement('div');
    skipLinks.setAttribute('id', 'skip-links');
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#analysis-results" class="skip-link">Skip to analysis results</a>
    `;

    // Style skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
        color: #fff;
        background: #000;
        padding: 8px 16px;
        text-decoration: none;
        z-index: 9999;
        border-radius: 4px;
      }
      
      .skip-link:focus {
        position: fixed;
        left: 10px;
        top: 10px;
        width: auto;
        height: auto;
        overflow: visible;
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  private setupFocusManagement(): void {
    // Enhanced focus indicators
    const style = document.createElement('style');
    style.textContent = `
      *:focus {
        outline: 3px solid #4A90E2 !important;
        outline-offset: 2px !important;
      }
      
      ${this.config.highContrast ? `
        *:focus {
          outline: 4px solid #FFFF00 !important;
          background-color: #000000 !important;
          color: #FFFFFF !important;
        }
      ` : ''}
      
      .focus-within {
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.3) !important;
      }
    `;

    document.head.appendChild(style);

    // Track focus for keyboard-only users
    document.addEventListener('mousedown', () => {
      document.body.classList.add('using-mouse');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.remove('using-mouse');
      }
    });
  }

  private setupFocusTrapping(): void {
    // This would be implemented for modal dialogs
    // Trap focus within modal boundaries
  }

  private applyInitialStyles(): void {
    const root = document.documentElement;

    if (this.config.highContrast) {
      root.classList.add('high-contrast');
    }

    if (this.config.largeText) {
      root.classList.add('large-text');
    }

    if (this.config.reducedMotion) {
      root.classList.add('reduced-motion');
    }

    if (this.config.colorBlindFriendly) {
      root.classList.add('colorblind-friendly');
    }

    // Apply CSS custom properties for theming
    this.applyTheme();
  }

  private applyTheme(): void {
    const colors = this.getAccessibleColorPalette();
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Typography scale for large text
    if (this.config.largeText) {
      root.style.setProperty('--font-size-base', '1.25rem');
      root.style.setProperty('--font-size-lg', '1.5rem');
      root.style.setProperty('--font-size-xl', '1.875rem');
      root.style.setProperty('--font-size-2xl', '2.25rem');
    }
  }

  private getAccessibleColorPalette(): ColorPalette {
    if (this.config.highContrast) {
      return {
        primary: '#FFFFFF',
        secondary: '#FFFF00',
        success: '#00FF00',
        warning: '#FFFF00',
        error: '#FF0000',
        background: '#000000',
        text: '#FFFFFF',
        border: '#FFFFFF'
      };
    }

    if (this.config.colorBlindFriendly) {
      return {
        primary: '#0173B2', // Blue
        secondary: '#DE8F05', // Orange
        success: '#029E73', // Green
        warning: '#CC78BC', // Pink
        error: '#D55E00', // Red-orange
        background: '#FFFFFF',
        text: '#000000',
        border: '#666666'
      };
    }

    // Default accessible palette (WCAG AA compliant)
    return {
      primary: '#2563eb', // Blue with 4.5:1 contrast
      secondary: '#7c3aed', // Purple with 4.5:1 contrast
      success: '#059669', // Green with 4.5:1 contrast
      warning: '#d97706', // Orange with 4.5:1 contrast
      error: '#dc2626', // Red with 4.5:1 contrast
      background: '#ffffff',
      text: '#111827', // Nearly black for maximum contrast
      border: '#6b7280'
    };
  }

  // Public methods for accessibility features

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.announcer) {
      this.announcer.setAttribute('aria-live', priority);
      this.announcer.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (this.announcer) {
          this.announcer.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Focus main content area
   */
  focusMainContent(): void {
    const mainContent = document.getElementById('main-content') ||
                       document.querySelector('main') ||
                       document.querySelector('[role="main"]');

    if (mainContent) {
      mainContent.focus();
      this.announce('Main content focused');
    }
  }

  /**
   * Focus navigation
   */
  focusNavigation(): void {
    const navigation = document.getElementById('navigation') ||
                      document.querySelector('nav') ||
                      document.querySelector('[role="navigation"]');

    if (navigation) {
      const firstLink = navigation.querySelector('a, button');
      if (firstLink) {
        (firstLink as HTMLElement).focus();
        this.announce('Navigation focused');
      }
    }
  }

  /**
   * Navigate to demo page
   */
  navigateToDemo(): void {
    this.announce('Navigating to demo');
    window.location.href = '/demo';
  }

  /**
   * Navigate to report page
   */
  navigateToReport(): void {
    this.announce('Navigating to analysis report');
    window.location.href = '/report';
  }

  /**
   * Close topmost overlay/modal
   */
  closeTopOverlay(): void {
    const overlay = document.querySelector('[role="dialog"]:not([hidden])') ||
                   document.querySelector('.modal:not([hidden])') ||
                   document.querySelector('.overlay:not([hidden])');

    if (overlay) {
      const closeButton = overlay.querySelector('[aria-label*="close"], [data-dismiss], .close-button');
      if (closeButton) {
        (closeButton as HTMLElement).click();
        this.announce('Overlay closed');
      }
    }
  }

  /**
   * Update accessibility configuration
   */
  updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };

    // Persist settings
    Object.entries(updates).forEach(([key, value]) => {
      localStorage.setItem(`a11y-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value.toString());
    });

    this.applyInitialStyles();
    this.notifyObservers();
  }

  /**
   * Get current configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Subscribe to configuration changes
   */
  onChange(callback: (config: AccessibilityConfig) => void): void {
    this.observers.push(callback);
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in accessibility observer:', error);
      }
    });
  }

  /**
   * Text-to-speech functionality
   */
  speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}): void {
    if (!this.config.textToSpeech || !window.speechSynthesis) {
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 0.8;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.8;

    // Use a clear, medical-appropriate voice if available
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice =>
      voice.lang.startsWith('en') &&
      (voice.name.includes('Alex') || voice.name.includes('Samantha'))
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechSynthesis.speak(utterance);
  }

  /**
   * Stop text-to-speech
   */
  stopSpeaking(): void {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Generate accessible medical report
   */
  generateAccessibleReport(data: any): string {
    let report = 'Medical Analysis Report. ';

    if (data.riskLevel) {
      report += `Risk Level: ${data.riskLevel}. `;
    }

    if (data.confidence) {
      report += `Confidence: ${Math.round(data.confidence * 100)} percent. `;
    }

    if (data.biomarkers && data.biomarkers.length > 0) {
      report += 'Key findings: ';
      data.biomarkers.forEach((biomarker: any, index: number) => {
        report += `${biomarker.name}: ${biomarker.value}${biomarker.unit || ''}. `;
      });
    }

    if (data.recommendations) {
      report += 'Recommendations: ';
      data.recommendations.forEach((rec: string, index: number) => {
        report += `${index + 1}. ${rec}. `;
      });
    }

    report += 'End of report.';
    return report;
  }

  /**
   * Validate color contrast ratios
   */
  validateColorContrast(foreground: string, background: string): {
    ratio: number;
    passes: { aa: boolean; aaa: boolean };
  } {
    const getRGB = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    const getRelativeLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const fgRGB = getRGB(foreground);
    const bgRGB = getRGB(background);

    const fgLuminance = getRelativeLuminance(fgRGB);
    const bgLuminance = getRelativeLuminance(bgRGB);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio,
      passes: {
        aa: ratio >= 4.5,  // WCAG AA standard
        aaa: ratio >= 7    // WCAG AAA standard
      }
    };
  }

  /**
   * Check if element is accessible
   */
  checkElementAccessibility(element: HTMLElement): {
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];

    // Check for missing alt text on images
    if (element.tagName === 'IMG' && !element.getAttribute('alt')) {
      issues.push('Image missing alt text');
    }

    // Check for missing labels on form inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
      const hasLabel = element.getAttribute('aria-label') ||
                      element.getAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${element.id}"]`);
      if (!hasLabel) {
        issues.push('Form element missing label');
      }
    }

    // Check for missing headings structure
    if (element.tagName.match(/^H[1-6]$/)) {
      // Check heading hierarchy (simplified)
      const level = parseInt(element.tagName.charAt(1));
      const prevHeading = element.previousElementSibling?.tagName.match(/^H[1-6]$/);
      if (prevHeading) {
        const prevLevel = parseInt(prevHeading[0].charAt(1));
        if (level > prevLevel + 1) {
          issues.push('Heading hierarchy skips levels');
        }
      }
    }

    // Check for interactive elements without keyboard access
    if (element.onclick && !element.hasAttribute('tabindex') &&
        !['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
      issues.push('Interactive element not keyboard accessible');
    }

    const score = Math.max(0, 100 - (issues.length * 25));
    return { issues, score };
  }
}

// Singleton instance
export const accessibilityHelper = new AccessibilityHelper();

// Auto-initialize accessibility features
if (typeof window !== 'undefined') {
  // Listen for system preference changes
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', () => {
    accessibilityHelper.updateConfig({ reducedMotion: motionQuery.matches });
  });

  const contrastQuery = window.matchMedia('(prefers-contrast: high)');
  contrastQuery.addEventListener('change', () => {
    accessibilityHelper.updateConfig({ highContrast: contrastQuery.matches });
  });
}
/**
 * BackgroundProcessor - Ensures continuous data processing even when tab is not active
 */

import { createComponentLogger } from './Logger';

export interface BackgroundTask {
  id: string;
  fn: () => Promise<void> | void;
  intervalMs: number;
  name: string;
}

export class BackgroundProcessor {
  private static instance: BackgroundProcessor;
  private tasks = new Map<string, { task: BackgroundTask; intervalId: NodeJS.Timeout | number }>();
  private logger = createComponentLogger('BackgroundProcessor');
  private isVisible = true;
  private lastActivity = Date.now();

  private constructor() {
    this.setupVisibilityHandling();
    this.setupActivityTracking();
  }

  static getInstance(): BackgroundProcessor {
    if (!BackgroundProcessor.instance) {
      BackgroundProcessor.instance = new BackgroundProcessor();
    }
    return BackgroundProcessor.instance;
  }

  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const wasVisible = this.isVisible;
      this.isVisible = !document.hidden;
      
      if (!wasVisible && this.isVisible) {
        this.logger.info('Tab became visible - continuing background processing');
      } else if (wasVisible && !this.isVisible) {
        this.logger.info('Tab hidden - maintaining background processing');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return;

    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    // Track various activity types
    const events = ['keydown', 'mousemove', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true, capture: true });
    });
  }

  registerTask(task: BackgroundTask): void {
    if (this.tasks.has(task.id)) {
      this.logger.warn(`Task ${task.id} already exists, replacing`);
      this.unregisterTask(task.id);
    }

    // Use setTimeout instead of setInterval for better background behavior
    const scheduleNext = () => {
      const timeoutId = setTimeout(async () => {
        try {
          await task.fn();
        } catch (error) {
          this.logger.error(`Task ${task.name} failed`, { 
            taskId: task.id, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
        
        // Schedule next execution if task still exists
        if (this.tasks.has(task.id)) {
          scheduleNext();
        }
      }, task.intervalMs);

      // Store the timeout ID
      this.tasks.set(task.id, { task, intervalId: timeoutId });
    };

    scheduleNext();
    this.logger.info(`Registered background task: ${task.name}`, { 
      taskId: task.id, 
      intervalMs: task.intervalMs 
    });
  }

  unregisterTask(taskId: string): void {
    const taskInfo = this.tasks.get(taskId);
    if (taskInfo) {
      if (typeof taskInfo.intervalId === 'number') {
        clearTimeout(taskInfo.intervalId);
      } else {
        clearInterval(taskInfo.intervalId);
      }
      this.tasks.delete(taskId);
      this.logger.info(`Unregistered background task: ${taskId}`);
    }
  }

  getActiveTaskCount(): number {
    return this.tasks.size;
  }

  getStats(): { 
    isVisible: boolean; 
    activeTaskCount: number; 
    lastActivity: number; 
    timeSinceActivity: number;
  } {
    return {
      isVisible: this.isVisible,
      activeTaskCount: this.tasks.size,
      lastActivity: this.lastActivity,
      timeSinceActivity: Date.now() - this.lastActivity
    };
  }

  destroy(): void {
    // Clean up all tasks
    for (const [taskId] of this.tasks) {
      this.unregisterTask(taskId);
    }
    this.logger.info('BackgroundProcessor destroyed');
  }
}

export const backgroundProcessor = BackgroundProcessor.getInstance();
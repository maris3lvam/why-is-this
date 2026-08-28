/**
 * @fileoverview Bounded diagnostic event recording session manager.
 *
 * Keeps bounded session events (max 1000 events default) to prevent memory leaks.
 */

export interface SessionEvent {
  readonly timestamp: number;
  readonly type: string;
  readonly detail: unknown;
}

class SessionManager {
  private activeSession: SessionEvent[] | null = null;
  private sessionName = '';

  public start(name = 'default'): void {
    this.sessionName = name;
    this.activeSession = [];
  }

  public record(type: string, detail: unknown): void {
    if (!this.activeSession) return;
    if (this.activeSession.length >= 1000) {
      this.activeSession.shift(); // Maintain bounded size
    }
    this.activeSession.push({
      timestamp: Date.now(),
      type,
      detail,
    });
  }

  public stop(): readonly SessionEvent[] {
    const events = this.activeSession ? [...this.activeSession] : [];
    this.activeSession = null;
    return Object.freeze(events);
  }

  public getEvents(): readonly SessionEvent[] {
    return Object.freeze(this.activeSession ? [...this.activeSession] : []);
  }

  public clear(): void {
    if (this.activeSession) {
      this.activeSession = [];
    }
  }
}

export const sessionManager = new SessionManager();

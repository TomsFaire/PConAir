import { randomBytes } from 'crypto';

const MAX_LOG = 20;
const SHOW_LOCK_ARM_MS = 2 * 60 * 1000;

export interface HealthLogEntry {
  timestamp: string;
  type: string;
  description: string;
}

/** In-memory show-lock arm token, health logs, companion heartbeat (spec 09). */
export function createReliabilityStore() {
  let pendingShowLockToken: string | null = null;
  let pendingShowLockDeadline = 0;
  const errors: HealthLogEntry[] = [];
  const warnings: HealthLogEntry[] = [];
  const heapSamples: number[] = [];
  let companionLastIso: string | null = null;
  let lastMemoryWarningAt = 0;

  function maybeLogMemoryPressure(heapUsedMb: number, heapTotalMb: number, pct: number): void {
    if (pct < 80) return;
    const now = Date.now();
    if (now - lastMemoryWarningAt < 60_000) return;
    lastMemoryWarningAt = now;
    logWarning(
      'MemoryPressure',
      `Heap usage at ${pct}% (${heapUsedMb} MB / ${heapTotalMb} MB)`
    );
  }

  function logError(type: string, description: string): void {
    errors.unshift({ timestamp: new Date().toISOString(), type, description });
    errors.length = Math.min(errors.length, MAX_LOG);
  }

  function logWarning(type: string, description: string): void {
    warnings.unshift({ timestamp: new Date().toISOString(), type, description });
    warnings.length = Math.min(warnings.length, MAX_LOG);
  }

  function armShowLock(): { status: string; message: string; confirmationToken: string } {
    const deadline = Date.now() + SHOW_LOCK_ARM_MS;
    const token = `${randomBytes(12).toString('hex')}_deadline_${new Date(deadline).toISOString()}`;
    pendingShowLockToken = token;
    pendingShowLockDeadline = deadline;
    return {
      status: 'confirmation_required',
      message:
        'You are about to lock admin. To unlock, enter the admin PIN on the /admin page. Emergency unlock (if PIN forgotten): restart app or use --reset-admin-pin CLI flag.',
      confirmationToken: token,
    };
  }

  /** Returns true if token matched and was consumed (caller should apply lock). */
  function consumeShowLockConfirmation(token: string): { ok: boolean; reason?: 'invalid' | 'expired' } {
    if (!pendingShowLockToken || token !== pendingShowLockToken) {
      return { ok: false, reason: 'invalid' };
    }
    if (Date.now() > pendingShowLockDeadline) {
      pendingShowLockToken = null;
      return { ok: false, reason: 'expired' };
    }
    pendingShowLockToken = null;
    return { ok: true };
  }

  function touchCompanionHeartbeat(): void {
    companionLastIso = new Date().toISOString();
  }

  function pushHeapSample(heapUsed: number): 'Stable' | 'Rising' {
    heapSamples.push(heapUsed);
    if (heapSamples.length > 5) heapSamples.shift();
    if (heapSamples.length < 3) return 'Stable';
    const [a, b, c] = heapSamples.slice(-3);
    if (c > b * 1.05 && b > a * 1.05) return 'Rising';
    return 'Stable';
  }

  return {
    armShowLock,
    consumeShowLockConfirmation,
    logError,
    logWarning,
    getErrors: (): HealthLogEntry[] => [...errors],
    getWarnings: (): HealthLogEntry[] => [...warnings],
    touchCompanionHeartbeat,
    getCompanionLastHeartbeat: (): string | null => companionLastIso,
    pushHeapSample,
    maybeLogMemoryPressure,
  };
}

export type ReliabilityStore = ReturnType<typeof createReliabilityStore>;

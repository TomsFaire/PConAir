export interface LogEntry {
  ts: string;        // ISO timestamp
  level: 'log' | 'warn' | 'error';
  message: string;
}

const RING_SIZE = 200;
const ring: LogEntry[] = [];
let verboseEnabled = false;

function push(level: LogEntry['level'], args: unknown[]): void {
  const message = args.map((a) =>
    typeof a === 'string' ? a : JSON.stringify(a)
  ).join(' ');
  ring.push({ ts: new Date().toISOString(), level, message });
  if (ring.length > RING_SIZE) ring.shift();
}

export function initLogger(): void {
  const origLog   = console.log.bind(console);
  const origWarn  = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args) => { if (verboseEnabled) push('log', args); origLog(...args); };
  console.warn  = (...args) => { push('warn', args);  origWarn(...args); };
  console.error = (...args) => { push('error', args); origError(...args); };
}

export function getLogs(): LogEntry[] {
  return [...ring];
}

export function clearLogs(): void {
  ring.length = 0;
}

export function setVerboseLogging(enabled: boolean): void {
  verboseEnabled = enabled;
}

export function isVerboseLogging(): boolean {
  return verboseEnabled;
}

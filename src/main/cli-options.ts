/** CLI flags for PC On Air main process (subset of specs/08). */

export interface ParsedPconairCli {
  operatorPin?: string;
  adminPin?: string;
  operatorSessionTimeoutSec?: number;
  adminSessionTimeoutSec?: number;
  clearAllowlist: boolean;
  trustForwardedFor: boolean;
}

function valAfterFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i === -1) return undefined;
  const v = argv[i + 1];
  return typeof v === 'string' && !v.startsWith('-') ? v : undefined;
}

function parseEq(argv: string[], prefix: string): string | undefined {
  for (const a of argv) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return undefined;
}

export function parsePconairCli(argv: string[]): ParsedPconairCli {
  const clearAllowlist = argv.includes('--clear-allowlist');
  const trustForwardedFor = argv.includes('--trust-forwarded-for');

  const operatorPin =
    parseEq(argv, '--operator-pin=') ?? valAfterFlag(argv, '--operator-pin');
  const adminPin = parseEq(argv, '--admin-pin=') ?? valAfterFlag(argv, '--admin-pin');

  const opT =
    parseEq(argv, '--operator-session-timeout=') ??
    valAfterFlag(argv, '--operator-session-timeout');
  const adT =
    parseEq(argv, '--admin-session-timeout=') ?? valAfterFlag(argv, '--admin-session-timeout');

  let operatorSessionTimeoutSec: number | undefined;
  let adminSessionTimeoutSec: number | undefined;
  if (opT !== undefined) {
    const n = parseInt(opT, 10);
    if (!Number.isNaN(n) && n > 0) operatorSessionTimeoutSec = n;
  }
  if (adT !== undefined) {
    const n = parseInt(adT, 10);
    if (!Number.isNaN(n) && n > 0) adminSessionTimeoutSec = n;
  }

  return {
    operatorPin: operatorPin?.length ? operatorPin : undefined,
    adminPin: adminPin?.length ? adminPin : undefined,
    operatorSessionTimeoutSec,
    adminSessionTimeoutSec,
    clearAllowlist,
    trustForwardedFor,
  };
}

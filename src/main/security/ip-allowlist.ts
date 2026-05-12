import { Address4, Address6 } from 'ip-address';

export interface AllowlistPrefs {
  enabled: boolean;
  entries: string[];
}

function normalizeIp(raw: string): string {
  if (raw.startsWith('::ffff:') && raw.includes('.')) {
    return raw.slice('::ffff:'.length);
  }
  return raw;
}

function matchesEntry(clientIp: string, entry: string): boolean {
  const e = entry.trim();
  if (!e) return false;
  const ip = normalizeIp(clientIp);

  if (e.includes('/')) {
    try {
      const cidr = new Address4(e);
      if (!Address4.isValid(ip)) return false;
      return cidr.isInSubnet(new Address4(ip));
    } catch {
      try {
        const cidr6 = new Address6(e);
        if (!Address6.isValid(clientIp)) return false;
        return cidr6.isInSubnet(new Address6(clientIp));
      } catch {
        return false;
      }
    }
  }

  return ip === normalizeIp(e) || clientIp === e;
}

/** Returns true if the client IP is allowed under the given allowlist prefs. */
export function isClientIpAllowlisted(clientIp: string, prefs: AllowlistPrefs): boolean {
  if (!prefs.enabled) return true;
  for (const entry of prefs.entries) {
    if (matchesEntry(clientIp, entry)) return true;
  }
  return false;
}

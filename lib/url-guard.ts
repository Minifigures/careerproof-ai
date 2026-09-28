// Pure SSRF checks for job-URL scraping: URL syntax, hostnames and IP literals.
// No I/O and no imports, so Node's test runner can load it directly. The DNS
// step that checks every resolved address lives in lib/scrape.ts.
//
// Cloud metadata endpoints fall inside the blocked ranges below:
// 169.254.169.254 and 169.254.170.2 (link-local), 100.100.100.200 (CGNAT) and
// fd00:ec2::254 (unique-local).

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, // link-local, includes cloud metadata 169.254.169.254
  /^::1$/,
  /\.local$/i,
  /\.internal$/i,
  /metadata/i,
];

// Lowercase, drop IPv6 brackets and any trailing dots ("localhost." is localhost).
export function normalizeHost(hostname: string): string {
  let host = hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  while (host.endsWith(".")) host = host.slice(0, -1);
  return host;
}

function parseIPv4(input: string): number[] | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;
  const bytes: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    bytes.push(value);
  }
  return bytes;
}

// Returns the eight 16-bit groups, or null when the input is not IPv6.
function parseIPv6(input: string): number[] | null {
  let text = input;
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);
  const lastColon = text.lastIndexOf(":");
  if (lastColon === -1) return null;

  // A trailing dotted IPv4 (as in ::ffff:127.0.0.1) fills the last two groups.
  let tail: number[] = [];
  const last = text.slice(lastColon + 1);
  if (last.includes(".")) {
    const v4 = parseIPv4(last);
    if (!v4) return null;
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]];
    text = text.slice(0, lastColon + 1);
    if (!text.endsWith("::")) text = text.slice(0, -1);
  }

  const groups = (part: string): number[] | null => {
    if (part === "") return [];
    const out: number[] = [];
    for (const group of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
      out.push(parseInt(group, 16));
    }
    return out;
  };

  const halves = text.split("::");
  if (halves.length > 2) return null;
  if (halves.length === 2) {
    const head = groups(halves[0]);
    const rest = groups(halves[1]);
    if (!head || !rest) return null;
    const fill = 8 - head.length - rest.length - tail.length;
    if (fill < 1) return null;
    return [...head, ...new Array<number>(fill).fill(0), ...rest, ...tail];
  }
  const all = groups(text);
  if (!all || all.length + tail.length !== 8) return null;
  return [...all, ...tail];
}

function isBlockedIPv4([a, b]: number[]): boolean {
  return (
    a === 0 || // 0.0.0.0/8, "this network"
    a === 10 || // 10/8 private
    a === 127 || // 127/8 loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 CGNAT
    (a === 169 && b === 254) || // 169.254/16 link-local
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12 private
    (a === 192 && b === 168) // 192.168/16 private
  );
}

function isBlockedIPv6(g: number[]): boolean {
  const firstFiveZero = g.slice(0, 5).every((x) => x === 0);
  if (firstFiveZero && g[5] === 0xffff) return true; // ::ffff:0:0/96 IPv4-mapped
  if (firstFiveZero && g[5] === 0) return true; // ::/96 unspecified, loopback, IPv4-compatible
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    // 64:ff9b::/96 NAT64 reaches the embedded IPv4 address.
    return isBlockedIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  return false;
}

export function isIpLiteral(host: string): boolean {
  const h = normalizeHost(host);
  return parseIPv4(h) !== null || parseIPv6(h) !== null;
}

// True when an IP address is in a blocked range. Anything that does not parse
// as an IP is treated as blocked, so a malformed DNS answer fails closed.
export function isBlockedIp(address: string): boolean {
  const h = normalizeHost(address);
  const v4 = parseIPv4(h);
  if (v4) return isBlockedIPv4(v4);
  const v6 = parseIPv6(h);
  if (v6) return isBlockedIPv6(v6);
  return true;
}

// True when the hostname is on the blocklist or is a blocked IP literal.
export function isBlockedHostname(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (host === "") return true;
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) return true;
  return isIpLiteral(host) && isBlockedIp(host);
}

// Syntax and hostname check only; lib/scrape.ts adds the DNS check.
export function isSafeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }
  return !isBlockedHostname(url.hostname);
}

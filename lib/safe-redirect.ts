// Post-sign-in redirect guard. Accepts only a same-origin relative path such as
// "/app?x=1"; anything else (absolute URLs, protocol-relative "//host", "/\host",
// "@host", backslashes, control characters) returns the fallback. Kept free of
// imports so Node's test runner can load it directly.

// Backslash, C0 controls and DEL. The URL parser strips tab and newline and
// treats "\" like "/", which can turn "/\t/evil.example" into "//evil.example".
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

export function safeRedirectPath(
  next: string | null | undefined,
  origin: string,
  fallback = "/app",
): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (UNSAFE_CHARS.test(next)) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(next, origin);
  } catch {
    return fallback;
  }
  return resolved.origin === origin ? next : fallback;
}

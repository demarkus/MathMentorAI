/**
 * Post-auth redirect safety.
 *
 * The `next` query value on the auth callback is fully attacker-controlled (it
 * rides along in confirmation/OAuth links). If we concatenate it onto the origin
 * we get an open redirect: `next=//evil.example` or `next=/\evil.example` would
 * bounce a freshly-authenticated user off-site. This normalises `next` to a
 * same-origin, absolute application path or falls back to a safe default.
 *
 * Rejected forms:
 *   - absolute URLs of any scheme (`https:`, `http:`, `mailto:`, `javascript:`)
 *   - protocol-relative URLs (`//evil.example`)
 *   - backslash-smuggled authorities (`/\evil.example`, `\\evil.example`) —
 *     WHATWG URL treats `\` as `/` for special schemes, so browsers would too
 *   - user-info / authority syntax that changes origin (`//user@evil.example`)
 *   - control characters and whitespace (can smuggle authority past naive checks)
 *   - anything not beginning with a single `/`
 */

export const DEFAULT_SAFE_PATH = "/dashboard";

export function safeNextPath(next: unknown, fallback: string = DEFAULT_SAFE_PATH): string {
  if (typeof next !== "string") return fallback;

  const value = next.trim();

  // Must be a non-empty, absolute path.
  if (!value.startsWith("/")) return fallback;

  // Protocol-relative ("//host") and backslash-smuggled ("/\host").
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;

  // Backslashes anywhere: browsers normalise `\` to `/`, which can reintroduce
  // an authority component after this check.
  if (value.includes("\\")) return fallback;

  // Control characters (0x00-0x1f, 0x7f) and any space/whitespace anywhere:
  // URL parsers strip or reinterpret these, which can hide an authority.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return fallback;
  }

  // Defence in depth: resolve against a throwaway origin and confirm the value
  // did not introduce a different origin. Any scheme/authority would change it.
  let resolved: URL;
  try {
    resolved = new URL(value, "http://safe.invalid");
  } catch {
    return fallback;
  }
  if (resolved.origin !== "http://safe.invalid") return fallback;

  // Re-serialise from the parsed local URL so only path+query+hash survive.
  const local = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  if (!local.startsWith("/") || local.startsWith("//")) return fallback;

  return local;
}

const KNOWN_ROUTE_PREFIXES = [
  "/auth",
  "/admin",
  "/nfc",
  "/home",
  "/found",
  "/lost",
  "/list",
  "/tracking",
  "/settings",
  "/banned",
] as const;

const KNOWN_EXACT_PATHS = ["/"] as const;

export function isKnownRoute(pathname: string): boolean {
  if ((KNOWN_EXACT_PATHS as readonly string[]).includes(pathname)) {
    return true;
  }

  return KNOWN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

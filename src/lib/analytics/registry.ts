/**
 * Typed view of `data/analytics.json`.
 *
 * Shape matches the fleet registry (version 1): one internal cookie, a spa
 * flag, and per-host GA4 id, Cloudflare Web Analytics token, aliases, and
 * legacy cookie names. The loader reads this module; do not hard-code IDs
 * beside it.
 */
import raw from "../../../data/analytics.json" with { type: "json" };

const GA4_ID_RE = /^G-[A-Z0-9]+$/;
const CF_TOKEN_RE = /^[a-f0-9]{32}$/;
const HOST_RE = /^[a-z0-9.-]+$/;
const COOKIE_RE = /^[A-Za-z0-9_-]+$/;

const TOP_LEVEL_KEYS = ["version", "internal_cookie", "spa", "hosts"] as const;
const HOST_ENTRY_KEYS = [
  "ga4_measurement_id",
  "cf_beacon_token",
  "aliases",
  "legacy_internal_cookies",
] as const;

export type HostEntry = {
  ga4_measurement_id: string;
  cf_beacon_token: string;
  aliases: string[];
  legacy_internal_cookies: string[];
};

export type AnalyticsRegistry = {
  version: 1;
  internal_cookie: string;
  spa: boolean;
  hosts: Record<string, HostEntry>;
};

function fail(message: string): never {
  throw new Error(`analytics registry: ${message}`);
}

function assertExactKeys(obj: object, allowed: readonly string[], path: string): void {
  const keys = Object.keys(obj);
  const unknown = keys.filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !keys.includes(key));
  if (unknown.length > 0) fail(`${path}: unknown keys: ${unknown.sort().join(", ")}`);
  if (missing.length > 0) fail(`${path}: missing keys: ${missing.sort().join(", ")}`);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function requireStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(`${path} must be an array of strings`);
  return value.map((item, index) => requireString(item, `${path}[${index}]`));
}

/** Validate the fleet registry shape. Returns the typed registry. */
export function validateAnalytics(payload: unknown): AnalyticsRegistry {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    fail("registry must be a JSON object");
  }
  const record = payload as Record<string, unknown>;
  assertExactKeys(record, TOP_LEVEL_KEYS, "registry");

  if (record.version !== 1) fail(`version must be 1, got ${String(record.version)}`);

  const internalCookie = requireString(record.internal_cookie, "internal_cookie");
  if (!COOKIE_RE.test(internalCookie)) {
    fail(`internal_cookie has invalid characters: ${internalCookie}`);
  }
  if (typeof record.spa !== "boolean") fail("spa must be a boolean");

  const hostsRaw = record.hosts;
  if (hostsRaw === null || typeof hostsRaw !== "object" || Array.isArray(hostsRaw)) {
    fail("hosts must be a non-empty object keyed by hostname");
  }
  const hostEntries = Object.entries(hostsRaw as Record<string, unknown>);
  if (hostEntries.length === 0) fail("hosts must be a non-empty object keyed by hostname");

  const hosts: Record<string, HostEntry> = {};
  const seen = new Set<string>();
  for (const [host, entry] of hostEntries) {
    if (!HOST_RE.test(host)) fail(`invalid host key ${host}`);
    if (seen.has(host)) fail(`duplicate hostname ${host}`);
    seen.add(host);
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`hosts[${host}] must be an object`);
    }
    const entryRecord = entry as Record<string, unknown>;
    const entryPath = `hosts[${host}]`;
    assertExactKeys(entryRecord, HOST_ENTRY_KEYS, entryPath);

    const ga4 = requireString(entryRecord.ga4_measurement_id, `${entryPath}.ga4_measurement_id`);
    if (!GA4_ID_RE.test(ga4)) fail(`${entryPath}.ga4_measurement_id invalid: ${ga4}`);
    const token = requireString(entryRecord.cf_beacon_token, `${entryPath}.cf_beacon_token`);
    if (!CF_TOKEN_RE.test(token)) fail(`${entryPath}.cf_beacon_token invalid`);

    const aliases = requireStringList(entryRecord.aliases, `${entryPath}.aliases`);
    for (const alias of aliases) {
      if (!HOST_RE.test(alias)) fail(`${entryPath}.aliases invalid: ${alias}`);
      if (alias === host) fail(`${entryPath}.aliases must not repeat the primary host`);
      if (seen.has(alias)) fail(`duplicate hostname via aliases: ${alias}`);
      seen.add(alias);
    }

    const legacy = requireStringList(
      entryRecord.legacy_internal_cookies,
      `${entryPath}.legacy_internal_cookies`,
    );
    for (const name of legacy) {
      if (!COOKIE_RE.test(name)) {
        fail(`${entryPath}.legacy_internal_cookies has invalid characters: ${name}`);
      }
    }

    hosts[host] = {
      ga4_measurement_id: ga4,
      cf_beacon_token: token,
      aliases,
      legacy_internal_cookies: legacy,
    };
  }

  return {
    version: 1,
    internal_cookie: internalCookie,
    spa: record.spa,
    hosts,
  };
}

let cached: AnalyticsRegistry | undefined;

export function loadAnalytics(): AnalyticsRegistry {
  if (!cached) cached = validateAnalytics(raw);
  return cached;
}

/** Primary host keys, then each alias, in registry order. */
export function hostnames(registry: AnalyticsRegistry = loadAnalytics()): string[] {
  const names: string[] = [];
  for (const [host, entry] of Object.entries(registry.hosts)) {
    for (const name of [host, ...entry.aliases]) {
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

/** Primary internal cookie, then unique per-host legacy names. */
export function honourCookies(registry: AnalyticsRegistry = loadAnalytics()): string[] {
  const names: string[] = [];
  const legacy = Object.values(registry.hosts).flatMap((entry) => entry.legacy_internal_cookies);
  for (const name of [registry.internal_cookie, ...legacy]) {
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function ga4Ids(registry: AnalyticsRegistry = loadAnalytics()): string[] {
  return uniqueSorted(Object.values(registry.hosts).map((entry) => entry.ga4_measurement_id));
}

export function cfTokens(registry: AnalyticsRegistry = loadAnalytics()): string[] {
  return uniqueSorted(Object.values(registry.hosts).map((entry) => entry.cf_beacon_token));
}

/** This build emits one measurement id. */
export function primaryGa4Id(registry: AnalyticsRegistry = loadAnalytics()): string {
  const ids = ga4Ids(registry);
  if (ids.length !== 1) {
    fail(`expected one GA4 measurement id for this site build, got ${ids.join(", ") || "(none)"}`);
  }
  return ids[0];
}

/** This build emits one Cloudflare beacon token. */
export function primaryCfToken(registry: AnalyticsRegistry = loadAnalytics()): string {
  const tokens = cfTokens(registry);
  if (tokens.length !== 1) {
    fail(`expected one CF beacon token for this site build, got ${tokens.length} distinct tokens`);
  }
  return tokens[0];
}

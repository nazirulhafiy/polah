#!/usr/bin/env node
/**
 * Fail if a built page's analytics loader drifts from data/analytics.json.
 *
 * Each HTML page must have exactly one analytics loader. A loader is a
 * `<script data-sn-analytics-loader>` or a hand-typed gtag/beacon script.
 * GA4 ids on the page must be in the registry. Cookie names must be the
 * registry `internal_cookie` or a per-host `legacy_internal_cookies` entry.
 *
 * Default (no --dist): render `/` from the Nitro build at
 * `.vercel/output/functions/__server.func` and check that HTML.
 * `--dist <dir>` checks every `*.html` file under that directory (used to
 * prove a seeded failure without touching the source).
 */
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_PATH = join(ROOT, "data", "analytics.json");
const SERVER_ENTRY = join(ROOT, ".vercel/output/functions/__server.func/index.mjs");

const LOADER_ATTR = "data-sn-analytics-loader";
const GA4_RE = /\bG-[A-Z0-9]+\b/g;
const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const PRIMARY_COOKIE_RE = /(?:\bvar\s+C|\bC)\s*=\s*(["'])([A-Za-z0-9_-]+)\1/g;
const LEGACY_LIST_RE = /\bL\s*=\s*\[(.*?)\]/gs;
const QUOTED_NAME_RE = /(["'])([A-Za-z0-9_-]+)\1/g;
const STRAY_COOKIE_RE =
  /document\.cookie\s*=\s*(["'])([A-Za-z0-9_-]+)\1|(["'])([A-Za-z0-9_-]+)\3\s*\+\s*['"]=1['"]|indexOf\(\s*(["'])([A-Za-z0-9_-]+)\5\s*\+\s*['"]=1['"]\)/g;
const BEACON_TOKEN_RE = /"token"\s*:\s*"([a-f0-9]{32})"/g;
const GA4_ID_RE = /^G-[A-Z0-9]+$/;
const CF_TOKEN_RE = /^[a-f0-9]{32}$/;
const HOST_RE = /^[a-z0-9.-]+$/;
const COOKIE_RE = /^[A-Za-z0-9_-]+$/;

const TOP_LEVEL = ["version", "internal_cookie", "spa", "hosts"];
const HOST_KEYS = ["ga4_measurement_id", "cf_beacon_token", "aliases", "legacy_internal_cookies"];

function fail(message) {
  const error = new Error(message);
  error.registry = true;
  throw error;
}

function exactKeys(obj, allowed, path) {
  const keys = Object.keys(obj);
  const unknown = keys.filter((key) => !allowed.includes(key)).sort();
  const missing = allowed.filter((key) => !keys.includes(key)).sort();
  if (unknown.length) fail(`${path}: unknown keys: ${unknown.join(", ")}`);
  if (missing.length) fail(`${path}: missing keys: ${missing.join(", ")}`);
}

function requireString(value, path) {
  if (typeof value !== "string" || value.trim() === "") fail(`${path} must be a non-empty string`);
  return value.trim();
}

function requireStringList(value, path) {
  if (!Array.isArray(value)) fail(`${path} must be an array of strings`);
  return value.map((item, index) => requireString(item, `${path}[${index}]`));
}

/** Validate fleet registry shape (version 1). */
export function validateRegistry(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    fail("registry must be a JSON object");
  }
  exactKeys(payload, TOP_LEVEL, "registry");
  if (payload.version !== 1) fail(`version must be 1, got ${payload.version}`);
  const internalCookie = requireString(payload.internal_cookie, "internal_cookie");
  if (!COOKIE_RE.test(internalCookie)) fail(`internal_cookie has invalid characters`);
  if (typeof payload.spa !== "boolean") fail("spa must be a boolean");
  if (payload.hosts === null || typeof payload.hosts !== "object" || Array.isArray(payload.hosts)) {
    fail("hosts must be a non-empty object");
  }
  const entries = Object.entries(payload.hosts);
  if (entries.length === 0) fail("hosts must be a non-empty object");

  const seen = new Set();
  const hosts = {};
  for (const [host, entry] of entries) {
    if (!HOST_RE.test(host)) fail(`invalid host key ${host}`);
    if (seen.has(host)) fail(`duplicate hostname ${host}`);
    seen.add(host);
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`hosts[${host}] must be an object`);
    }
    const entryPath = `hosts[${host}]`;
    exactKeys(entry, HOST_KEYS, entryPath);
    const ga4 = requireString(entry.ga4_measurement_id, `${entryPath}.ga4_measurement_id`);
    if (!GA4_ID_RE.test(ga4)) fail(`${entryPath}.ga4_measurement_id invalid: ${ga4}`);
    const token = requireString(entry.cf_beacon_token, `${entryPath}.cf_beacon_token`);
    if (!CF_TOKEN_RE.test(token)) fail(`${entryPath}.cf_beacon_token invalid`);
    const aliases = requireStringList(entry.aliases, `${entryPath}.aliases`);
    for (const alias of aliases) {
      if (!HOST_RE.test(alias)) fail(`${entryPath}.aliases invalid: ${alias}`);
      if (alias === host || seen.has(alias)) fail(`duplicate hostname ${alias}`);
      seen.add(alias);
    }
    const legacy = requireStringList(
      entry.legacy_internal_cookies,
      `${entryPath}.legacy_internal_cookies`,
    );
    for (const name of legacy) {
      if (!COOKIE_RE.test(name)) fail(`${entryPath}.legacy_internal_cookies invalid: ${name}`);
    }
    hosts[host] = {
      ga4_measurement_id: ga4,
      cf_beacon_token: token,
      aliases,
      legacy_internal_cookies: legacy,
    };
  }

  return { version: 1, internal_cookie: internalCookie, spa: payload.spa, hosts };
}

export function loadRegistry(path = REGISTRY_PATH) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${path}: ${error instanceof Error ? error.message : error}`);
  }
  return validateRegistry(payload);
}

export function ga4Ids(registry) {
  return [...new Set(Object.values(registry.hosts).map((entry) => entry.ga4_measurement_id))];
}

export function cfTokens(registry) {
  return [...new Set(Object.values(registry.hosts).map((entry) => entry.cf_beacon_token))];
}

export function honourCookies(registry) {
  const names = [];
  const legacy = Object.values(registry.hosts).flatMap((entry) => entry.legacy_internal_cookies);
  for (const name of [registry.internal_cookie, ...legacy]) {
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function isAnalyticsScript(block) {
  const lower = block.toLowerCase();
  if (lower.includes(LOADER_ATTR)) return true;
  if (/<script\b[^>]*\bsrc\s*=\s*['"][^'"]*googletagmanager\.com\/gtag\/js/i.test(block)) {
    return true;
  }
  if (/<script\b[^>]*\bsrc\s*=\s*['"][^'"]*cloudflareinsights\.com\/beacon/i.test(block)) {
    return true;
  }
  if (/<script\b[^>]*\bdata-cf-beacon\s*=/i.test(block)) return true;
  if (/gtag\(\s*['"]config['"]/.test(block)) return true;
  return false;
}

function cookieNames(html, blocks) {
  const found = new Set();
  const sources = blocks.length > 0 ? blocks : [html];
  for (const block of sources) {
    for (const match of block.matchAll(PRIMARY_COOKIE_RE)) found.add(match[2]);
    for (const list of block.matchAll(LEGACY_LIST_RE)) {
      for (const quoted of list[1].matchAll(QUOTED_NAME_RE)) found.add(quoted[2]);
    }
  }
  if (
    html.includes("traffic_type") ||
    html.includes("cloudflareinsights.com/beacon") ||
    html.includes(LOADER_ATTR)
  ) {
    for (const match of html.matchAll(STRAY_COOKIE_RE)) {
      const name = match[2] || match[4] || match[6];
      if (name) found.add(name);
    }
  }
  return found;
}

/**
 * @param {string} rel
 * @param {string} html
 * @param {ReturnType<typeof validateRegistry>} registry
 * @returns {string[]}
 */
export function checkHtml(rel, html, registry) {
  const errors = [];
  const scripts = html.match(SCRIPT_RE) ?? [];
  const loaders = scripts.filter(isAnalyticsScript);
  if (loaders.length === 0) {
    errors.push(`${rel}: zero analytics loaders (missing ${LOADER_ATTR})`);
    return errors;
  }
  if (loaders.length !== 1) {
    errors.push(`${rel}: ${loaders.length} analytics loaders (want exactly one ${LOADER_ATTR})`);
  }

  const allowedIds = new Set(ga4Ids(registry));
  const pageIds = new Set(html.match(GA4_RE) ?? []);
  for (const id of [...pageIds].sort()) {
    if (!allowedIds.has(id)) errors.push(`${rel}: GA4 id '${id}' not in data/analytics.json`);
  }

  const mentionsBeacon =
    html.includes("cloudflareinsights.com/beacon") || html.includes("data-cf-beacon");
  if (mentionsBeacon) {
    const allowedTokens = new Set(cfTokens(registry));
    const tokens = new Set([...html.matchAll(BEACON_TOKEN_RE)].map((match) => match[1]));
    for (const token of [...tokens].sort()) {
      if (!allowedTokens.has(token)) {
        errors.push(`${rel}: CF beacon token '${token}' not in data/analytics.json`);
      }
    }
    const spaValues = [...html.matchAll(/"spa"\s*:\s*(true|false)/g)].map((match) => match[1]);
    const want = registry.spa ? "true" : "false";
    if (spaValues.some((value) => value !== want)) {
      errors.push(`${rel}: registry spa is ${registry.spa} but CF beacon spa drifts`);
    }
  }

  const allowedCookies = new Set(honourCookies(registry));
  const found = cookieNames(
    html,
    loaders.filter((block) => block.includes(LOADER_ATTR)),
  );
  for (const name of [...found].sort()) {
    if (!allowedCookies.has(name)) {
      errors.push(
        `${rel}: cookie name '${name}' is not registry internal_cookie ` +
          `(${registry.internal_cookie}) or legacy_internal_cookies`,
      );
    }
  }
  if (!found.has(registry.internal_cookie)) {
    errors.push(
      `${rel}: missing registry cookie '${registry.internal_cookie}' ` +
        `(found ${[...found].sort().join(", ") || "none"})`,
    );
  }
  return errors;
}

export function htmlPages(dir) {
  /** @type {string[]} */
  const pages = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else if (name.endsWith(".html")) pages.push(path);
    }
  };
  walk(dir);
  pages.sort();
  return pages;
}

async function renderBuiltHomepage() {
  if (!existsSync(SERVER_ENTRY)) {
    throw new Error(`built server missing: ${SERVER_ENTRY} (run npm run build first)`);
  }
  const mod = await import(pathToFileURL(SERVER_ENTRY).href);
  const handler = mod.default;
  if (handler && typeof handler.fetch === "function") {
    const response = await handler.fetch(new Request("https://polah.app/"));
    return await response.text();
  }
  if (typeof handler !== "function") {
    throw new Error("built server default export is not a request handler");
  }
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("built server did not bind a port");
  }
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      headers: { host: "polah.app" },
    });
    return await response.text();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function parseArgs(argv) {
  /** @type {{ dist: string | null, registry: string }} */
  const args = { dist: null, registry: REGISTRY_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dist") {
      args.dist = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--registry") {
      args.registry = argv[i + 1] ?? "";
      i += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }

  let registry;
  try {
    registry = loadRegistry(args.registry);
  } catch (error) {
    console.error(`Analytics dist check FAILED: ${error instanceof Error ? error.message : error}`);
    return 1;
  }

  /** @type {{ rel: string, html: string }[]} */
  const pages = [];
  if (args.dist !== null) {
    if (!existsSync(args.dist) || !statSync(args.dist).isDirectory()) {
      console.error(`Analytics dist check FAILED: dist directory missing: ${args.dist}`);
      return 1;
    }
    const files = htmlPages(args.dist);
    if (files.length === 0) {
      console.error(`Analytics dist check FAILED: no HTML pages under ${args.dist}`);
      return 1;
    }
    for (const file of files) {
      pages.push({ rel: relative(args.dist, file) || file, html: readFileSync(file, "utf8") });
    }
  } else {
    let html;
    try {
      html = await renderBuiltHomepage();
    } catch (error) {
      console.error(
        `Analytics dist check FAILED: ${error instanceof Error ? error.message : error}`,
      );
      return 1;
    }
    pages.push({ rel: "built SSR /", html });
  }

  const errors = pages.flatMap((page) => checkHtml(page.rel, page.html, registry));
  if (errors.length > 0) {
    console.error("Analytics dist check FAILED:");
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }

  console.log(
    `Analytics dist check OK: ${pages.length} page(s), ` +
      `cookie=${JSON.stringify(registry.internal_cookie)}, spa=${registry.spa}, ` +
      `ga4=${JSON.stringify(ga4Ids(registry))}, hosts=${JSON.stringify(Object.keys(registry.hosts))}`,
  );
  return 0;
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().then((code) => {
    process.exit(code);
  });
}

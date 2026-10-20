import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkHtml, loadRegistry, main } from "./check-analytics-dist.mjs";

const registry = loadRegistry();

function page(body) {
  return `<!DOCTYPE html><html><head>${body}</head><body></body></html>`;
}

function loader({ id, cookie, token, extra = "" } = {}) {
  const measurementId = id ?? registry.hosts["polah.app"].ga4_measurement_id;
  const name = cookie ?? registry.internal_cookie;
  const beacon = token ?? registry.hosts["polah.app"].cf_beacon_token;
  const spa = registry.spa ? "true" : "false";
  return (
    `<script data-sn-analytics-loader="">(function(){` +
    `var C="${name}",L=["${name}"];` +
    `var id="${measurementId}";` +
    `s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);` +
    `s.src='https://static.cloudflareinsights.com/beacon.min.js';` +
    `s.setAttribute('data-cf-beacon','{"token":"${beacon}","spa":${spa}}');` +
    `${extra}})();</script>`
  );
}

test("repo registry keeps the live polah ids and the shared internal cookie", () => {
  assert.equal(registry.version, 1);
  assert.equal(registry.internal_cookie, "sn_internal");
  assert.equal(registry.spa, false);
  assert.deepEqual(Object.keys(registry.hosts), ["polah.app"]);
  assert.equal(registry.hosts["polah.app"].ga4_measurement_id, "G-B3BZXWWDH9");
  assert.equal(registry.hosts["polah.app"].cf_beacon_token, "cd795175569a442ca30e7c08a6295f9f");
  assert.deepEqual(registry.hosts["polah.app"].aliases, ["www.polah.app"]);
  assert.deepEqual(registry.hosts["polah.app"].legacy_internal_cookies, []);
});

test("one registry loader passes", () => {
  assert.deepEqual(checkHtml("index.html", page(loader()), registry), []);
});

test("zero loaders fails and names the file", () => {
  const errors = checkHtml("index.html", page(""), registry);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /index\.html: zero analytics loaders/);
});

test("two loaders fails", () => {
  const errors = checkHtml("index.html", page(loader() + loader()), registry);
  assert.ok(
    errors.some((error) => /2 analytics loaders/.test(error)),
    errors.join("\n"),
  );
});

test("an id that is not in the registry fails", () => {
  const errors = checkHtml("index.html", page(loader({ id: "G-NOTINREGISTRY" })), registry);
  assert.ok(
    errors.some((error) => error.includes("G-NOTINREGISTRY")),
    errors.join("\n"),
  );
});

test("the wrong cookie fails", () => {
  const errors = checkHtml("index.html", page(loader({ cookie: "ga_internal" })), registry);
  assert.ok(
    errors.some((error) => error.includes("ga_internal")),
    errors.join("\n"),
  );
});

test("main --dist fails on a seeded duplicate and passes when the seed is gone", async () => {
  const badDir = mkdtempSync(join(tmpdir(), "analytics-bad-"));
  const goodDir = mkdtempSync(join(tmpdir(), "analytics-good-"));
  writeFileSync(join(badDir, "index.html"), page(loader() + loader({ id: "G-NOTINREGISTRY" })));
  writeFileSync(join(goodDir, "index.html"), page(loader()));
  assert.equal(await main(["--dist", badDir]), 1);
  assert.equal(await main(["--dist", goodDir]), 0);
});

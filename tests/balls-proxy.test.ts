import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ballsProxyMiddleware, {
  targetForBallsRequest,
} from "../server/middleware/balls-proxy.ts";

describe("targetForBallsRequest", () => {
  it("maps normal game paths to the fixed game origin", () => {
    assert.equal(
      targetForBallsRequest(
        new URL("https://polah.app/balls/assets/game.js?v=2"),
      )?.href,
      "https://hafiy.my/cat-pinball-game/assets/game.js?v=2",
    );
  });

  it("keeps absolute URL text inside the fixed game path", () => {
    const target = targetForBallsRequest(
      new URL("https://polah.app/balls/https://example.invalid/probe"),
    );

    assert.equal(target?.origin, "https://hafiy.my");
    assert.equal(
      target?.pathname,
      "/cat-pinball-game/https://example.invalid/probe",
    );
  });

  it("keeps repeated slashes inside the fixed game path", () => {
    const target = targetForBallsRequest(
      new URL("https://polah.app/balls///example.invalid/probe"),
    );

    assert.equal(target?.origin, "https://hafiy.my");
    assert.ok(target?.pathname.startsWith("/cat-pinball-game/"));
  });

  it("rejects encoded separators and traversal after repeated decoding", () => {
    for (const path of [
      "%2e%2e%2fadmin",
      "%2E%2E%2Fadmin",
      "..%5cadmin",
      "%252e%252e%252fadmin",
    ]) {
      assert.equal(
        targetForBallsRequest(new URL(`https://polah.app/balls/${path}`)),
        null,
      );
    }
  });

  it("returns 400 without fetching an unsafe target", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("fetch must not run");
    };

    try {
      const response = await ballsProxyMiddleware(
        {
          url: new URL("https://polah.app/balls/%2e%2e%2fadmin"),
          req: { method: "GET", headers: new Headers() },
        },
        () => undefined,
      );

      assert.ok(response instanceof Response);
      assert.equal(response.status, 400);
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

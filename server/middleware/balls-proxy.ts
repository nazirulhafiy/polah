const ORIGIN = "https://cat-balls-paws-of-chaos.vercel.app";

type ProxyEvent = {
  url: URL;
  req: { method: string; headers: Headers };
};

function isBallsPath(path: string): boolean {
  return path === "/balls" || path.startsWith("/balls/");
}

function originPath(path: string): string {
  const stripped = path.slice("/balls".length);
  return stripped.length === 0 ? "/" : stripped;
}

function shouldRewrite(contentType: string): boolean {
  return (
    contentType.includes("text/html") ||
    contentType.includes("text/css") ||
    contentType.includes("javascript") ||
    contentType.includes("json") ||
    contentType.includes("svg")
  );
}

/** Prefix root-absolute game assets so they stay under /balls/. */
function rewriteBallsUrls(body: string): string {
  return body
    .replace(/(^|[`"'(=\s])\/assets\//g, "$1/balls/assets/")
    .replace(/(^|[`"'(=\s])\/favicon\.svg/g, "$1/balls/favicon.svg")
    .replace(
      /(\/balls\/assets\/index-[a-zA-Z0-9_-]+\.(?:js|css))/g,
      "$1?v=2",
    );
}

export default async function ballsProxyMiddleware(
  event: ProxyEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = event.url.pathname;
  if (!isBallsPath(path)) return next();

  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return next();

  if (path === "/balls") {
    return new Response(null, {
      status: 301,
      headers: { location: `/balls/${event.url.search}` },
    });
  }

  const target = new URL(originPath(path) + event.url.search, ORIGIN);
  const upstream = await fetch(target, {
    method,
    headers: {
      accept: event.req.headers.get("accept") ?? "*/*",
      "accept-encoding": "identity",
    },
    redirect: "manual",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("content-security-policy");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("cdn-cache-control", "no-store");

  if (method === "HEAD" || !shouldRewrite(headers.get("content-type") ?? "")) {
    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  }

  const rewritten = rewriteBallsUrls(await upstream.text());
  return new Response(rewritten, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

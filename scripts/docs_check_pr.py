#!/usr/bin/env python3
"""Fail pull requests that change design or behaviour without updating docs/.

Watched paths (keep in sync with .github/workflows/docs-check.yml and docs/ci-docs-check.md):
- src/**/*.css
- src/**/*.js
- src/**/*.jsx
- src/**/*.ts
- src/**/*.tsx
- server/**/*.js
- server/**/*.ts
- public/favicon.ico
- public/favicon.svg
- scripts/install-page.html
- scripts/migrate.mjs
- scripts/migration-plan.mjs
- scripts/with-app-env.mjs
- scripts/app-env-plugin.mjs
- scripts/grok-pwa-plugin.mjs
- scripts/grok-pwa-shared.mjs
- scripts/grok-pwa-shared.d.mts
- scripts/preview.mjs
- vite.config.ts
- vercel.json

Not watched: src/data/**, *.test.*, public/projects/**, public/og.jpg,
public/sitemap.xml, public/robots.txt, migrations/**, tests/**, package.json.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

SRC_SUFFIXES = (".css", ".js", ".jsx", ".ts", ".tsx")
SERVER_SUFFIXES = (".js", ".ts")
TEST_SUFFIXES = (".test.ts", ".test.tsx", ".test.js", ".test.jsx", ".test.mjs")
WATCHED_EXACT = frozenset(
    {
        "public/favicon.ico",
        "public/favicon.svg",
        "scripts/install-page.html",
        "scripts/migrate.mjs",
        "scripts/migration-plan.mjs",
        "scripts/with-app-env.mjs",
        "scripts/app-env-plugin.mjs",
        "scripts/grok-pwa-plugin.mjs",
        "scripts/grok-pwa-shared.mjs",
        "scripts/grok-pwa-shared.d.mts",
        "scripts/preview.mjs",
        "vite.config.ts",
        "vercel.json",
    }
)

DOCS_PREFIX = "docs/"
LABEL_NAME = "no-docs-needed"
FAILURE_MESSAGE = (
    "This PR changes how the site looks or behaves but doesn't update docs/. "
    "Update docs/design.md, or add the no-docs-needed label if no doc change is needed."
)


def normalize_path(path: str) -> str:
    return path.replace("\\", "/").lstrip("./")


def is_watched(path: str) -> bool:
    normalized = normalize_path(path)
    if normalized.startswith("src/data/"):
        return False
    if normalized.endswith(TEST_SUFFIXES):
        return False
    if normalized.startswith("src/") and normalized.endswith(SRC_SUFFIXES):
        return True
    if normalized.startswith("server/") and normalized.endswith(SERVER_SUFFIXES):
        return True
    return normalized in WATCHED_EXACT


def is_docs_change(path: str) -> bool:
    return normalize_path(path).startswith(DOCS_PREFIX)


def git_changed_files(base: str, head: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def pr_has_no_docs_label(event_path: str | None) -> bool:
    if not event_path:
        return False
    payload = json.loads(Path(event_path).read_text(encoding="utf-8"))
    labels = payload.get("pull_request", {}).get("labels", [])
    return any(label.get("name") == LABEL_NAME for label in labels)


def main(argv: list[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    base = os.environ.get("DOCS_CHECK_BASE")
    head = os.environ.get("DOCS_CHECK_HEAD")
    event_path = os.environ.get("GITHUB_EVENT_PATH")

    if len(argv) >= 2:
        base, head = argv[0], argv[1]
    if not base or not head:
        print("DOCS_CHECK_BASE and DOCS_CHECK_HEAD are required.", file=sys.stderr)
        return 2

    if pr_has_no_docs_label(event_path):
        print(f"Label {LABEL_NAME!r} present; docs check skipped.")
        return 0

    changed = git_changed_files(base, head)
    watched = [path for path in changed if is_watched(path)]
    docs = [path for path in changed if is_docs_change(path)]

    if watched and not docs:
        print(FAILURE_MESSAGE, file=sys.stderr)
        print("Watched files changed:", file=sys.stderr)
        for path in watched:
            print(f"  - {path}", file=sys.stderr)
        return 1

    if watched:
        print("Design/behavior files changed with matching docs/ updates.")
    else:
        print("No watched design/behavior files changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# Testing — v1.0.0 release candidate

Use Node 22.18+; this environment used Node 24.18.0. Install the lockfile with npm ci. The original 104 tests from Phases 1–3 are retained unchanged, with three release guards added.

## Automated commands

```sh
npm test
npm run build
npm run lint
npm audit
git diff --check
```

The Windows environment blocks npm's cmd.exe script launcher. Equivalent operations were run directly: Node --experimental-strip-types --import ./scripts/test-tsx-loader.mjs --test tests/*.test.ts; node node_modules/typescript/bin/tsc -b; Vite build through its API; node node_modules/eslint/bin/eslint.js .; npm-cli.js audit. Clean installation used npm-cli.js ci --ignore-scripts: public engine assets are already vendored and native Vite packages were available without postinstall. No policy was modified.

## Coverage and actual results

- 40 engine/controller tests: both/random colors, all five skills, legal/illegal input, UCI order, stale callbacks/cancelled sessions, Worker failures/retry/deadlines, promotion Q/R/B/N, endings, undo/newgame/rematch and cleanup.
- 50 progression tests: rewards/level boundaries/statistics, history limit, persisted lifetime dedupe, reload/repeated load, malformed/unsupported data, unavailable/full/silent storage, both colors' results, real ending transitions, completion timing, abandonment and undo policy.
- 14 UI tests: server-rendered semantics, labelled dialogs/actions/status, focus containment/restoration/cleanup with DOM doubles, keyboard coordinate syntax and progress/history accessibility.
- Three RC guards: metadata/version/lock alignment and patch; Open Graph/favicon/PNG dimensions; engine digest and bundled source/license notices.
- Source-map-js was narrowly updated 1.2.1 → 1.2.2; no other package versions changed. Full npm audit after clean install reports **0 vulnerabilities**. Registry results are point-in-time, not a security guarantee.

Final test/build/lint results are recorded in [release-v1.0.0](release-v1.0.0.md). No tests send application data or call a remote chess engine. Fake Workers and SSR are not real WASM/browser execution.

## Browser and manual acceptance

Browser QA is attempted on the local Vite server with the environment's external Playwright/Chromium. If first navigation fails, no scenario is considered passed. Do not bypass local network/browser restrictions or turn static assertions into visual evidence.

Required widths: **320, 375, 390, 768, 1024, 1440 px**, plus low-height landscape and zoom. Check no horizontal overflow; initial setup scrolling; keyboard-only settings/start/moves; dialog Tab/Shift+Tab containment and opener/fallback focus; promotion Q/R/B/N; result Review/Escape/rematch/settings; history keyboard scrolling; XP and session-only notice wrapping; live loading/error/retry announcements; both board orientations; reduced-motion changes; physical mobile drag/drop and actual Stockfish moves on all skills. Test Chrome/Firefox/Safari and a screen reader. Repeat reload/blocked-storage/private-mode scenarios. Do not clear real user data to test failure modes.

Successful Vercel build/status does not close these checks. Real-device evidence and explicit final acceptance are still needed before a tag/Release is authorized.

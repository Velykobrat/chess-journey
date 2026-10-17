# Chess Journey v1.0.0 — Release Candidate

## Status and scope

Prepared from main at `5b32aeaac730e036458da6f9638e163a569f6e43`. This is a candidate for manual acceptance, not a published release. No tag or GitHub Release is created. The final published commit is identified in Git history by `chore: prepare chess journey v1.0.0 release candidate`.

Phases 1–3 remain intact: Stockfish 19 lifecycle, chess.js rules, UI design, XP rewards (30/15/5), level formula, storage schema and completion idempotency are unchanged. No analytics, accounts, server or new gameplay features were added.

## Audit findings

| Severity | Confirmed finding | Resolution |
| --- | --- | --- |
| Critical | None confirmed in this bounded review | No critical issue remains identified |
| High | Transitive development dependency source-map-js 1.2.1 affected by GHSA-68fv-2mgg-jv7q | Patched to 1.2.2 only |
| Medium | Vendored Stockfish distribution lacked adjacent full GPL text and explicit pinned source provenance | Added Copying.txt, SOURCE.md and THIRD_PARTY_NOTICES.md; retained engine binaries |
| Low | Package version 0.0.0 and template metadata/favicon did not identify the release product | Version 1.0.0, product title/description, favicon and Open Graph image |
| Low | README reflected earlier phases; unused public icon sprite remained | Updated documentation and removed the unreferenced sprite |

Review covered React/store boundaries, controller rules and completion, Worker/UCI cancellation identity and recoverable errors, progress validation/storage fallback, dialog/focus/keyboard implementation, reduced motion, public assets, dependency graph and Git hygiene. No confirmed runtime defect justified changing game logic or design. Automated/static evidence does not establish real-device accessibility or browser correctness.

## Dependency security

[GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) concerns malformed indexed source maps causing denial of service. The affected package is transitive through PostCSS/Vite in development tooling, not a newly introduced application data endpoint. The lockfile changes only source-map-js 1.2.1 → 1.2.2 plus root release metadata. No React, Vite, chess.js or Stockfish version was changed; no force fix was used.

A clean pinned install with scripts disabled, tests, TypeScript, build and lint verified the patch. Final npm audit reports zero known vulnerabilities at the time checked; no residual advisory was reported. Registry results are time-sensitive and are not a security guarantee.

## Verification — 2026-10-17

| Check | Result |
| --- | --- |
| Tests | 107 passed, 0 failed; all 104 previous tests retained |
| TypeScript | Passed, tsc -b |
| Production build | Passed, Vite 8.3.1 |
| ESLint | Passed |
| npm audit | 0 vulnerabilities |
| git diff --check | Passed |
| Browser QA | Blocked: Chromium navigation to localhost returned ERR_NETWORK_ACCESS_DENIED; no browser scenario passed |

The environment blocks npm's cmd.exe script launcher; equivalent direct Node commands were used as documented in [testing](testing.md). Three new regression tests cover version/lock alignment and patched dependency, branded metadata/image dimensions, and Stockfish digest/license/source notices. Fake Workers and UI semantics tests do not execute real WASM or certify assistive-technology behavior.

## Manual acceptance still required

- Test actual Stockfish startup, moves and retry on both colors and all five difficulties.
- Exercise legal/illegal moves, all promotions, endings, undo before completion, new game/rematch and pending promotion/error states.
- Verify XP once per completed game, reload persistence, history and honest session-only warnings under storage failure.
- Check keyboard-only play, modal focus/return, screen-reader announcements, reduced motion and physical mobile drag/drop.
- Review 320, 375, 390, 768, 1024 and 1440 px, landscape and zoom for overflow, wrapping and scroll access in Chrome, Firefox and Safari.
- Verify deployed favicon/social preview and real JS/WASM delivery. Vercel success alone does not complete gameplay or visual QA.

Progress is origin-local, has no backup/cloud sync and does not resume unfinished games. Multi-tab updates are not transactional; detected conflicts switch to session-only state. Lifetime credited IDs grow within the documented storage limit. Google Fonts requires a network request; offline installation is not promised. Engine watchdogs may require Retry on slow/background devices.

## Proposed release notes

Chess Journey is a browser chess game against Stockfish 19 with five difficulties, either player color, promotion and keyboard moves. Local Player Journey tracks completed games with motivational XP, derived levels/statistics and the latest ten results, without accounts or Elo.

The candidate preserves the dark/gold interface and established engine protections, supplies product metadata and social assets, patches source-map-js, and documents architecture, testing and third-party licensing. The application is MIT-licensed; the separately distributed Stockfish engine is GPLv3. See [third-party notices](../THIRD_PARTY_NOTICES.md).

Documentation: [README](../README.md), [architecture](architecture.md), [testing](testing.md), [portfolio case](portfolio-case.md). Previous phase reports remain historical records. Final acceptance and any tag/Release require separate authorization.

# Phase 1 — Game Engine Stability

Baseline: `e49b807a6f6153b4e894d796df6b1355db0fad24` (main). Scope: game/engine reliability only. No XP, progression, statistics, game storage, server or accounts added. Existing journey labels remain static UI.

## Confirmed defects

- `App.tsx` used one aiMoveExpected boolean across stop/newgame/rematch. A delayed bestmove could be accepted as the next request, including a legal move on an identical reset FEN. UCI does not attach a request ID to bestmove; isready is not a cancellation acknowledgement.
- Worker error only changed a text label. The ready/thinking flags and disabled controls could remain stuck; factory/postMessage failures and a silent engine had no recovery path.
- Promotion was inferred from SAN prefix. Capture promotions (`gxh8=Q+`) did not start the picker; promotion-related status also depended on an incomplete memo dependency list.
- Undo required two plies and was disabled during thinking, preventing recovery of a just-played move when the AI stalled. A pending promotion was not cleared on undo.
- Engine position commands sent only current FEN, losing repetition context even though chess.js retained game history.

## Implementation

`src/services/engine.ts` owns a Worker session with explicit UCI/configuration/readiness/search phases. Initialization order is uci → uciok → Skill Level + ucinewgame → isready → readyok → position/go. A single session has at most one outstanding search. Bestmove is consumed once in the search phase.

Cancellation does not send stop and reuse the same Worker. New game/setup, difficulty changes, rematch, undo, retries and unmount detach handlers, invalidate the session identity and terminate it. A replacement Worker completes a fresh handshake before searching. Already queued callbacks retain the old session identity and cannot affect the replacement. Ordinary completed searches reuse the healthy Worker, without overlapping go commands.

The expected FEN is captured with each request. Before application, the controller checks active game, turn, FEN and chess.js legal moves, including an exact promotion suffix. Invalid/none bestmove on a nonterminal position becomes a recoverable engine error, not a silent skipped opponent turn.

Timeouts are **liveness watchdogs**, not race-condition delays: 15 s initialization, 10 s search, with the existing go movetime 500. Expiration terminates the session and exposes Retry engine; it never retries automatically. error/messageerror/factory/postMessage failures share this recovery. Retry keeps the position/history; New game remains available. Errors dismiss a pending promotion to avoid hiding recovery behind its modal.

`src/game/controller.ts` owns chess.js and immutable UI snapshots. React subscribes with useSyncExternalStore; an effect connects/disposes the engine, including development StrictMode's setup/cleanup cycle. Construction alone never creates a Worker. App retains screen markup, class names, board options and CSS; the error-only recovery button uses the existing secondary-button style.

Promotion candidates come from verbose legal moves for both colors and Q/R/B/N. Undo cancels the engine, clears promotion and rewinds to the previous human decision (one ply during AI search, two after a reply). Undoing Black's first engine opening restarts the opening search. Game endings are chess.js checkmate/stalemate/material/repetition/fifty-move outcomes. Position commands include initial FEN plus full UCI move history.

## Automated verification

- 40 Node built-in tests with a fake Worker: UCI ordering, all 5 skills, both/random colors, legal/illegal moves, interrupted and completed undo, rematch/new game/settings races, stale ready/error/bestmove callbacks, cleanup/StrictMode, factory/postMessage/messageerror, malformed/illegal/none bestmove, fake-clock watchdogs, all underpromotions, terminal states and recovery during promotion.
- No new dependencies. `npm test` uses Node's TypeScript stripping; use Node 22.18+ (verified here on Node 24.18.0). Tests do not emulate React rendering, actual WASM execution or browser layout.
- TypeScript build, Vite production build, ESLint and git diff whitespace checks are executed before commit. Direct Node entry points are used because this Windows environment cannot run npm scripts through cmd.exe.
- Browser smoke attempted with external Playwright/Chromium against the Vite localhost server. The first navigation failed with ERR_CONNECTION_TIMED_OUT; no real browser/Worker success is claimed and no network restrictions were bypassed.
- CSS, public Stockfish JS/WASM, framework/chess.js versions and package-lock remain unchanged.

## Remaining checks and limits

Manually verify real Stockfish readiness/moves as White and Black on all difficulties; rapid newgame/settings/rematch during search; undo/promotion picker and all four pieces; simulated Worker/WASM load failure and Retry; background-tab throttling; Chrome/Firefox/Safari/mobile drag-and-drop and visual parity. Cold Worker reloads on cancellation can cost startup time, especially on mobile; ordinary moves do not recreate the engine.

The locked baseline has a **pre-existing dev-only transitive advisory**: source-map-js 1.2.1 via PostCSS/Vite, GHSA-68fv-2mgg-jv7q (high, malformed indexed source-map DoS). npm audit reports 1 high. No dependency versions/lock were changed in this game-engine phase; review a narrow patch separately and do not treat lint/build passing as a clean dependency audit.

References: [Stockfish UCI implementation](https://github.com/official-stockfish/Stockfish/blob/master/src/uci.cpp), [chess.js API](https://github.com/jhlywa/chess.js/blob/master/website/docs/index.md), [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

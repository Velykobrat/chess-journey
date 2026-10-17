# Architecture — Chess Journey v1.0.0 candidate

## Boundaries

| Module | Responsibility |
| --- | --- |
| App | Creates stable controller/progress stores, connects them in an effect, composes UI and local Review state |
| GameController | chess.js authority, legal turn gates, promotion, undo, result/completion ID and synchronous completion notification |
| StockfishEngine | Worker identity, serialized UCI handshake/search, expected position, error/watchdog and termination |
| progress/model | Pure XP/statistics/history/validation/idempotency; derived level/win rate |
| progress/storage | Versioned localStorage read/compare/write/read-back; preservation of unsupported data |
| ProgressStore | Immutable subscribed snapshots, once-only load and session-only fallback |
| ui/* | Typed screen components, native keyboard form, modal focus/scroll, reduced-motion preference |

No server or runtime credentials are required. React uses useSyncExternalStore; object construction/render do not start Workers or read browser storage. StrictMode cleanup/reconnect is supported. The UI theme, board and core contracts from Phases 1–3 remain unchanged in the RC.

## Game and engine path

```text
Drop / keyboard coordinates / promotion choice
  → GameController + chess.js legal move
  → terminal? latch completion → ProgressStore.record
  → otherwise StockfishEngine position + go
  → current session bestmove → expected FEN/turn/legal checks → chess.js move
```

Stockfish receives initial FEN plus move history so repetition context is retained. UCI initialization is uci → uciok → Skill Level + ucinewgame → isready → readyok. Normal searches are serialized and reuse a healthy Worker. Cancellation/restart/undo/settings/retry invalidate identity, detach handlers, clear watchdogs and terminate the Worker; a replacement completes a new handshake. An isready response is not used as a stop acknowledgement.

Worker creation/postMessage/error/messageerror, illegal/malformed/none moves and liveness expiry expose recoverable error state. There are no timer-based race workarounds or automatic retry loops. Watchdogs are 15 s initialization / 10 s search, while search requests retain movetime 500. Slow/background devices may hit the watchdog and need Retry; real-device acceptance is still pending.

## Completion and progress

chess.js determines checkmate, stalemate, material/repetition/fifty-move draws. Only an actually applied terminal move records completion. A unique game ID is latched before the callback; finished-game undo is disabled. New game/rematch has another ID. Abandoned or failed engine sessions do not grant XP.

Win +30, draw +15, loss +5; level floor(totalXP/100)+1, win rate wins/totalGames×100. Storage schema v1 checks safe integer counters, sum/XP consistency, outcome/color/difficulty/date/move metadata, the last ten records and lifetime credited IDs. Level/rate are not redundantly stored. Details and bounds: [Phase 2](phase-2-progress.md).

Storage is local to the browser origin, capped at 1,000,000 JSON characters; the ID-only lifetime ledger grows with games. Unsupported/corrupt/inaccessible storage is not deleted. Failed writes or detected external changes switch this tab to memory, with a visible notice. This is not transactional cross-tab storage, cloud synchronization, anti-cheat or a backup. No unfinished-game persistence.

## UI and accessibility

Native details provides history and keyboard moves; coordinate syntax is normalized, legality remains in the controller. Dialogs are labelled, focus-contained, background-inert and restore an available opener or the main game region. Setup/promotion require completing their intended choice; result can be dismissed with Review/Escape. Reduced motion disables board animation and interaction transitions. SSR/DOM-double checks cover semantics, not browser behavior or assistive-technology certification.

## Assets, network and deployment

Vite builds static dist/ and copies public/. Stockfish 19 lite single-threaded JS/WASM are local assets and match the npm distribution; single-threaded build does not need multi-threaded-engine cross-origin isolation. See [engine source/license](../public/stockfish/SOURCE.md). Google Fonts is the only explicit remote UI resource in source. No analytics or application data transport was added; local progress is never sent by application code. Hosting/font transport may still receive standard network metadata.

Existing Vercel Git integration deploys main, Vite output dist/, domain-root paths. Package metadata/index.html/social preview define product identity; no SEO/ranking outcomes are claimed. Dependency scope and deployment evidence: [release report](release-v1.0.0.md). Audit/tests are a bounded review, not a guarantee of absence of vulnerabilities.

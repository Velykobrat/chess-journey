# Phase 2 — Player Journey & Local Progress

Base: main `c49ba7d6d0b964f6c41b10e7c48ea233c1464ab3`. Phase 1 engine/session protocol and its 40 tests are preserved. No dependency versions/lock changes, account, cloud, database, Elo, leaderboard or learning system.

## Completion and undo contract

GameController assigns a unique game ID on each real start/rematch. A synchronous completion callback is fired only after an applied chess.js move makes the game terminal. Outcome uses checkmate/side to move vs player color; all other chess.js endings are draws. Initial terminal test positions, setup, engine errors, abandoned games, and unfinished games do not earn XP.

The completion is latched before notification, independently of React effects/renders. Rapid rematch/newgame cannot erase an earned result before recording. Storage failure is isolated from chess. After completion, **undo is disabled for that game**; no rollback of XP and no replay farming of the same completed game. Before completion, Phase 1 undo behaves as before. New game/rematch starts a separate ID; another actually completed game earns its own XP.

A history move count means `ceil(plies / 2)`, matching the existing game-result UI. It is not the FEN fullmove counter. Completion date is UTC ISO, shown in the user's browser locale. No board state, PGN, name, email or account information is stored.

## Modules

- `src/game/controller.ts`: immutable CompletedGame event, game identity and terminal latch; no progress/storage imports.
- `src/progress/model.ts`: XP, derived level/win rate, immutable progress updates, closed-schema validation and deduplication.
- `src/progress/storage.ts`: safe localStorage boundary, compare-before-write, read-back verification; no removal/clear.
- `src/progress/store.ts`: external store with stable immutable snapshots and an explicit session-only fallback.
- `src/progress/JourneyCard.tsx`: existing journey-card styles, real values, accessible progressbar and native details/history list. Its history scroll area is keyboard-focusable.
- `App.tsx`: connects the completion callback directly to the store, loads progress before connecting the controller, subscribes via useSyncExternalStore.

Construction/render has no storage or Worker side effects. Store load is once per instance, so React StrictMode's effect replay cannot reset session-only earnings. A reloaded page reads saved progress but does not restore an unfinished chess game.

## Rules and schema v1

Win +30 XP; draw +15; loss +5. Level is `floor(totalXP / 100) + 1`; progress within the level is `totalXP % 100`. Win rate is wins/totalGames × 100, zero for no completed games; display rounds to a whole percent. XP is motivational, not Elo.

Key: `chess-journey:progress:v1`. Stored fields: version, totalGames, wins, draws, losses, totalXP, creditedIds, history. No persisted currentLevel/winRate. Validation checks safe nonnegative integer counters, totals and XP formula, unique credited IDs, exact last-ten history shape/order, outcomes, per-game XP, color, difficulty, moves and ISO date. Unsupported/extra fields fail closed; unknown data is never automatically migrated or overwritten.

History is newest-first and holds at most ten full game records (ID/date/result/color/difficulty/moves/XP). A separate lifetime ledger retains **only game IDs** beyond ten, so replaying an old completion after reload cannot grant XP again. This is an explicit storage tradeoff: ledger size grows with completed games, not with board histories. JSON reads/writes are capped at 1,000,000 characters; reaching that or a browser quota switches the current tab to memory without wiping the saved record.

## Storage failures and limitations

- First run: empty progress; reading alone does not write.
- Malformed JSON, unsupported version, invalid types/counters/history, denied getter/read: saved value stays untouched; a clean session-only progress state and visible notice are used.
- Write/quota/silent-write/read-back failures: current earnings remain in memory with a visible notice. Repeated load calls do not erase them. Unsaved earnings cannot survive reload; no claim to the contrary is made.
- If the key changes externally after load, the next write is refused and this tab becomes session-only rather than overwriting another tab's data. LocalStorage is **not transactional across tabs**; this phase provides no atomic multi-tab merge or cloud synchronization. Use one playing tab and reload to use externally saved state.
- Local data can be edited/cleared by the user/browser and is not an anti-cheat record or backup. It is origin/browser-local. No PII or new network transport is introduced.

## Verification

90/90 Node tests PASS: all 40 Phase 1 tests unchanged plus 50 progress/storage/controller cases. Coverage includes XP and level boundaries 0/99/100/199/200, statistics/fractional win rate, history limit and lifetime dedupe after reload, first/repeated load, malformed/unknown/inconsistent data, unavailable/denied/full/silent storage, external changes, both colors' wins/losses, actual mate/stalemate/material/repetition/fifty-move transitions, synchronous completion, repeated callbacks, newgame/rematch/undo, stale sessions, and callback failure isolation.

TypeScript (`tsc -b`), Vite production build, ESLint and git whitespace checks pass using direct Node entry points. They are the operations behind npm test/build/lint; npm shell script execution is unavailable in this Windows environment. No additional test dependency was installed. Runtime used for verification: Node 24.18.0; tests require Node 22.18+.

Browser smoke was attempted against the Vite localhost server using the available external Playwright/Chromium. The first page.goto failed with ERR_CONNECTION_TIMED_OUT, before UI or real Worker checks. No browser PASS/visual approval is claimed; no environment restriction was bypassed.

Manual checks still needed: journey card wrapping/contrast on desktop/mobile; keyboard history expansion/scrolling; result → XP → rematch updates with real WASM; reload persistence; browser private mode/blocked storage/quota notice; all AI difficulties and colors; completion/undo-disabled UX; storage behavior in separate tabs. The existing dev-only source-map-js advisory from Phase 1 remains unchanged; this phase does not alter dependencies.

No Git tag/Release or automatic next phase. Deployment uses the existing Git integration after verified publication to main.

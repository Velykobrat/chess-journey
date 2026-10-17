# Phase 3 — Architecture & UX Polish

Base: main `2a28f7289393b488acaa3c08ff6e8c35c8527932`. Scope is UI structure, keyboard/accessibility and focused responsive polish, without a redesign or a new product phase.

## Confirmed issues and changes

- App mixed all six independent screen sections in roughly 500 lines. It now coordinates state and composes Header, GameBoard, GamePanel, GameSetup, PromotionDialog and GameResultDialog. Shared Dialog owns the common modal focus/scroll behavior. KeyboardMove is a small accessibility alternative, not another game engine.
- Overlays were ordinary divs with no dialog name/modal semantics, focus containment, background inertness or focus restoration. They now expose role=dialog/aria-modal, labelled headings/descriptions, initial focus, Tab/Shift+Tab containment, programmatic focus containment, scroll lock and opener restoration. If the opener disappeared, became disabled or inert, focus returns to the main game region.
- Setup and promotion require a setting/start or piece choice and remain intentionally non-dismissible; they never silently abandon pending state or auto-select a promotion. Result supports Escape and Review game, allowing access to the completed board, XP and history without starting another match. Review changes only UI visibility, never the controller or credited result. A new completed game ID opens its own result again.
- Current setup choices only had a visual active class. Color/difficulty groups now have labels and aria-pressed on their native buttons. Decorative glyphs/checkmarks are hidden from accessible names.
- Engine/game status was silent to assistive technology. Polite atomic status regions now announce it, including loading/error/retry inside setup while background content is inert.
- Piece dragging was the only application-level move entry. The existing vendor has a generic DnD keyboard sensor, but no clear labelled coordinate-entry workflow. A collapsed Keyboard moves details provides From/To inputs and a Move button. Coordinates are syntax-normalized only; the unchanged controller.drop and chess.js determine legality, turn gates and promotion. It includes a screen-reader piece inventory, feedback, disabled state and no autofocus. Mouse/touch drag code and Stockfish path remain unchanged.
- Reduced-motion preference was ignored by CSS and the board animation setting. CSS interactions now honor it, and the board disables animations/uses zero duration when requested, including preference changes during the session.
- Fixed, center-aligned dialog cards had no viewport height/scroll limit. Cards now have bounded dynamic-viewport height and internal scrolling, safe-area-aware backdrop padding. Min-width/text wrapping fixes protect player labels, history and move rows; no overflow:hidden masking is used for the page.
- V2 Preview was misleading. The badge now says Local play; its existing mobile hiding behavior is retained.
- Move history is a labelled keyboard-focusable region. Player journey is a labelled section, with an explicit XP-to-next-level progressbar description and atomic session-only notice. Existing details/history semantics remain native.

## Preserved contracts

GameController, StockfishEngine, ProgressStore and the progress model/storage are unchanged. XP remains 30/15/5, level formula and localStorage schema/ID ledger/idempotency are unchanged. Completion undo policy, WASM/session lifecycle, all 90 Phase 1/2 tests, dependency versions/lock, public Stockfish JS/WASM, dark/gold palette, board colors/style and original screen class names are preserved.

The three unused src/assets files (react.svg, vite.svg, hero.png) were removed only after git grep confirmed no repository references/imports. Public favicon and all Stockfish files remain. No source debug console calls were found. There is no account/server/DB/cloud/Elo/achievement/learning feature.

## Components and React review

App uses the same lazy stores, connect/dispose effect and stable useSyncExternalStore subscriptions. UI components receive typed snapshots/callbacks; effects are limited to browser focus/scroll and reduced-motion subscription. Event handlers perform move entry, not effects. Review state is local presentation state. Progress remains subscribed inside JourneyCard. The vercel:react-best-practices checklist was applied without introducing another styling framework/dependency.

The common focus helper is separately testable with DOM doubles. Test-only TSX loading uses Node registerHooks plus the already installed TypeScript compiler; the test command adds --import scripts/test-tsx-loader.mjs. No runtime/test dependency or version was added. Node 22.18+ is required as before; local checks used Node 24.18.0.

## Verification

- **104/104 tests PASS**: all previous 90 preserved, 14 new tests for modal/selection/status semantics, result review control, promotion choices for both colors, keyboard coordinate controls/description, progress/history semantics, focus initial/trap/programmatic-escape/restore/fallback/cleanup and empty enabled-controls behavior.
- TypeScript `tsc -b`, ESLint, Vite production build and git diff/staged whitespace checks pass through their direct Node entry points (the npm script shell is blocked in this Windows environment).
- Tests use SSR markup and DOM doubles. They are not an accessibility certification or browser-layout measurement; physical keyboard/touch interactions, actual focus behavior in browsers, and screen-reader announcements need manual verification.
- Browser smoke attempted on the local Vite server using the environment's external Playwright/Chromium. The first page.goto to http://127.0.0.1:4174/ failed with **ERR_CONNECTION_TIMED_OUT**. No real UI/WASM/browser scenario was reached; no browser PASS is claimed and no restriction was bypassed.

| Viewport width | Browser status |
| --- | --- |
| 320 | Pending manual check |
| 375 | Pending manual check |
| 390 | Pending manual check |
| 768 | Pending manual check |
| 1024 | Pending manual check |
| 1440 | Pending manual check |

## Before final v1.0 acceptance

Manually verify the matrix above (including low-height landscape/zoom) for no horizontal overflow, setup/dialog scroll, typography/spacing, XP/history/session notice wrapping. Keyboard-only: setup → start → coordinate move → promotion Q/R/B/N → result → Review/Escape or rematch/settings; check focus restoration when controls become disabled/removed, history scrolling and retry. Check both board orientations, physical mobile drag/drop, real Stockfish 19, reduced-motion changes, screen readers, storage reload/private-mode behavior and the existing Phase 1/2 scenarios.

The known pre-existing dev-only source-map-js audit advisory remains as documented in Phase 1; dependency versions were explicitly outside this phase. Final product acceptance still needs real browser/device evidence. This phase does not create a Git tag/Release or start Phase 4.

# Chess Journey

A browser chess game against **Stockfish 19**, with five difficulty settings, keyboard and drag-and-drop moves, and local player progression. Version **1.0.0 release candidate** — automated checks completed; final browser/device acceptance remains open. No account, backend, analytics or cloud synchronization.

[Open Chess Journey](https://chess-journey.vercel.app/) · [Release-candidate report](docs/release-v1.0.0.md)

## Features

- Play White, Black or a randomly chosen color on the existing dark/gold board.
- Five Stockfish Skill Level settings; chess.js handles legal moves, Q/R/B/N promotion and game endings.
- New game, rematch, board flip and pre-completion undo; stale cancelled Worker sessions cannot play in replacement games.
- Recoverable engine loading/error/retry states, keyboard coordinate moves, labelled focus-managed dialogs and reduced motion.
- XP, levels, statistics and ten recent completed games stored locally when browser storage permits.

## Technology

React 19, TypeScript 6, Vite 8, react-chessboard, chess.js 1.4 and Stockfish.js 19 WASM. Node's built-in test runner uses the existing TypeScript compiler for TSX tests. No state-management framework, database or extra test dependency.

## Local development

Use Node **22.18+** (checks performed on Node 24.18.0) and npm. Keep `package-lock.json` and use the pinned installation:

```sh
npm ci
npm run dev
```

Vite prints the local URL. The JS/WASM pair is already in `public/stockfish/`; it is not fetched from a CDN. Development requires a normal browser with Web Workers and WebAssembly.

```sh
npm test
npm run lint
npm run build
npm audit
git diff --check
npm run preview
```

`build` runs TypeScript project checks then generates `dist/`. `preview` serves that built output for local QA; it is not a production server. Environment restrictions and the direct Node equivalents used here are documented in [testing](docs/testing.md).

## Architecture

`App.tsx` coordinates stores and screen components. `GameController` owns chess.js, turns, completion IDs and undo policy. `StockfishEngine` owns UCI/Worker sessions and watchdogs. `src/progress/` separates model, storage, store and journey UI. `src/ui/` holds screen components, dialogs and keyboard controls. [Architecture and data flow](docs/architecture.md).

## XP and local progress

Win **+30 XP**, draw **+15 XP**, loss **+5 XP**. Level starts at 1 and increases every 100 total XP; XP is motivation, **not Elo**. Win rate and level are derived. Only a real chess.js game completion is credited; abandoned games earn nothing. Completed games cannot be undone. Rematch starts a new game ID.

The versioned `chess-journey:progress:v1` record holds consistent lifetime counters, the ten most recent results and a lifetime credited-ID ledger for deduplication. It contains no names/accounts or full board histories. Corrupt/unknown data is preserved, never automatically cleared. Storage failures switch the current tab to memory and show a notice; unsaved progress is lost on reload. There is no unfinished-game restoration, backup, anti-cheat guarantee or atomic multi-tab merge. Use one playing tab. Detailed schema/limits: [Phase 2](docs/phase-2-progress.md).

## Stockfish / WASM

The bundled build is `stockfish-19-lite-single`: single-threaded, runs locally in a Worker, with no server engine. It retains Stockfish 19 but the lite build is not identical in strength to the larger upstream build; difficulty labels are settings, not calibrated Elo ratings. Engine downloads/startup can take time on slower devices. Initialization/search failures expose Retry; cancellation terminates and replaces the session.

The unmodified engine's GPL license and source links are included at [public/stockfish/SOURCE.md](public/stockfish/SOURCE.md). Keep its JS/WASM, license and notices together. The application MIT license does not override Stockfish's GPL. [Third-party notices](THIRD_PARTY_NOTICES.md).

## Deployment

Existing Vercel Git integration publishes `main`: Vite build, output `dist/`. The app assumes hosting at the domain root (`/stockfish/...` and root metadata URLs). No secrets or server provisioning are required. Preserve public engine assets/license and serve WASM correctly. Deployment success is checked for the published commit; it does not prove browser gameplay. No manual deploy or production settings changes are part of this RC.

## Known limits and release status

- Browser QA in the implementation environment fails on the first localhost navigation. No final browser, screen-reader, touch or responsive PASS is claimed; the acceptance matrix is in [testing](docs/testing.md).
- Local progress is browser/origin-specific and can be cleared or edited by the user. It is not synchronized or an online ranking.
- Google Fonts is a third-party network resource; first load and fonts/engine caching are not a guaranteed offline/PWA mode. No analytics/tracking has been added.
- npm audit is a registry advisory check, not proof of security. The known source-map-js advisory was patched narrowly to 1.2.2; framework/engine versions are unchanged.
- Package version 1.0.0 identifies the candidate; no final Git tag/Release exists from this task. Final release requires separate approval and real-device acceptance.

## Documentation

[Architecture](docs/architecture.md) · [Testing](docs/testing.md) · [Release v1.0.0 candidate](docs/release-v1.0.0.md) · [Portfolio case](docs/portfolio-case.md)

Historical implementation reports are preserved: [Phase 1](docs/phase-1-stability.md), [Phase 2](docs/phase-2-progress.md), [Phase 3](docs/phase-3-polish.md). Their earlier audit warnings/test counts refer to those phases; the current RC report supersedes them operationally.

## License

Application code: [MIT](LICENSE), existing copyright notice retained. Engine and dependency terms: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No usage, sales, user-count or advertising-result claims are made.

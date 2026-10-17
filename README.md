# Chess Journey — Phase 2

Local player journey: win +30 XP, draw +15, loss +5; a new level every 100 total XP, consistent lifetime stats and the last ten completed games. No Elo or accounts.

Progress is versioned localStorage data with a session-only fallback and a visible notice when persistence is unavailable. Completed games cannot be undone; abandoned games earn no XP. Rules, schema, failure behavior and QA: [Phase 2 report](docs/phase-2-progress.md).

`npm test`, `npm run lint`, `npm run build`; Node 22.18+ for the built-in TypeScript test runner. Dependency versions remain unchanged. Phase 1 engine stability and all 40 baseline tests are preserved. Browser QA is pending due to the implementation environment's localhost restriction.

## Earlier phase reference

# Chess Journey — Phase 1

Game/Stockfish lifecycle stabilization. Architecture, confirmed defects, tests and manual QA: [Phase 1 report](docs/phase-1-stability.md).

Use Node 22.18+ for the dependency-free TypeScript tests:

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

React/Vite/chess.js/Stockfish versions, visuals and screen structure are preserved. No XP/progression/history feature is implemented in this phase; existing journey labels remain placeholders. Browser QA in the implementation environment was blocked on localhost, and the existing dev dependency audit warning is documented in the report.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

# BeBetter Development — Chess Journey

## Problem

Build a maintainable browser chess product with a reliable local engine, understandable play controls and motivating progress without requiring an account or a server. Avoid race-driven wrong moves, unrecoverable engine errors and duplicated rewards.

## Solution

React/TypeScript/Vite application using chess.js rules and a local Stockfish 19 single-threaded WASM Worker. Game identity and Worker-session identity solve different problems: one protects completion/XP, the other isolates cancelled searches. Progress is separated into a validated pure model, a browser storage boundary and an immutable subscribed store.

## Design and UX

The established dark palette, gold accents and board remain. Keyboard coordinate entry complements drag/drop; accessible dialogs handle focus and background isolation. Engine error/retry, reduced motion, a compact journey card and native recent-history disclosure keep existing screen structure clear. This is UI polish, not a redesign.

## Engineering

Small screen components are composed by App, without a new framework/state library. Versioned local progress includes consistent statistics and a ten-game history, with lifetime completion-ID deduplication. Unsupported data is preserved; denied/full storage degrades visibly to memory. The application has no cloud/account/analytics feature. Stockfish remains an attributed GPL component alongside the application's MIT source.

## Verification and limits

The candidate retains 104 tests and adds three release guards; build/type/lint/audit are checked. The known dev source-map-js advisory is addressed by a single patch update. Browser QA is limited by localhost access in the implementation environment, so no final visual/device/WASM success is claimed. Evidence: [release report](release-v1.0.0.md), [testing](testing.md).

## Outcome and future use

A release candidate ready for manual product acceptance, with documented deployment, maintenance boundaries and known limits. It is not a validated training curriculum, calibrated Elo system or proof of user/revenue/conversion results. No customers, usage statistics or business metrics are invented. Any later features or final release require their own approval; this task does not begin a new phase.

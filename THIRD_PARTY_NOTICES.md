# Third-party notices

Chess Journey application source is covered by the root [MIT license](LICENSE). Dependencies and bundled engine retain their own licenses; MIT does not relicense Stockfish/WASM.

## Bundled Stockfish.js 19

Unmodified lite single-threaded JS/WASM from `stockfish@19.0.0`, Nathan Rugg / Chess.com and Stockfish contributors. The original JS header also credits neural-network authors. GPL-3.0 text, source/build links and asset provenance are shipped alongside the engine: [public/stockfish/SOURCE.md](public/stockfish/SOURCE.md), [Copying.txt](public/stockfish/Copying.txt). Those files are also copied into the deployed static output by Vite.

## Other direct runtime dependencies

| Package | License |
| --- | --- |
| React / React DOM | MIT |
| react-chessboard | MIT |
| chess.js | BSD-2-Clause |

The lockfile records exact versions, integrity and package license metadata. Installed packages retain upstream license files. Consult those notices when redistributing dependency code; this document does not replace them.

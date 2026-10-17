# Stockfish 19 distribution

These unmodified files match `stockfish@19.0.0`'s lite single-threaded build:

- `stockfish-19-lite-single.js`
- `stockfish-19-lite-single.wasm`

Upstream: https://github.com/nmrugg/stockfish.js/tree/v19.0.0

Corresponding source archive: https://github.com/nmrugg/stockfish.js/archive/refs/tags/v19.0.0.tar.gz

Build instructions: https://github.com/nmrugg/stockfish.js/blob/v19.0.0/README.md#how-do-i-compile-the-engine

Engine authors, Stockfish.js attribution and neural-network attribution are preserved in the JS header. The network named there is `nn-61e7af4bb97d`; its upstream download is https://tests.stockfishchess.org/nns?network_name=nn-61e7af4bb97d .

License: GNU GPL v3, included verbatim as [Copying.txt](Copying.txt). The application's root MIT license does not replace this license.

Release-candidate verification: JS matched the npm distribution after text line-ending normalization; WASM matched byte-for-byte. WASM SHA-256: `57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387`.

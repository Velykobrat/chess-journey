import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { GameController, DIFFICULTIES, gameResult } from '../src/game/controller.ts';
import { StockfishEngine, type EngineWorker } from '../src/services/engine.ts';

class FakeWorker implements EngineWorker {
  onmessage: EngineWorker['onmessage'] = null;
  onerror: EngineWorker['onerror'] = null;
  onmessageerror: EngineWorker['onmessageerror'] = null;
  sent: string[] = [];
  terminated = false;
  throwOnSend = false;
  postMessage(command: string) { if (this.throwOnSend) throw Error('postMessage failed'); this.sent.push(command); }
  terminate() { this.terminated = true; }
  emit(data: string) { this.onmessage?.(new MessageEvent('message', { data })); }
  ready() { this.emit('uciok'); this.emit('readyok'); }
  queued() { const callback = this.onmessage; return (data: string) => callback?.(new MessageEvent('message', { data })); }
  crash() { this.onerror?.({} as ErrorEvent); }
}
function fixture(t: { after: (callback: () => void) => void }, options: { fen?: string; random?: () => number; black?: boolean } = {}) {
  const workers: FakeWorker[] = [];
  const controller = new GameController(() => { const worker = new FakeWorker(); workers.push(worker); return worker; }, options.fen, options.random);
  const stop = controller.connect(); t.after(stop);
  workers.at(-1)!.ready();
  if (options.black) controller.setPlayerColorChoice('black');
  const start = () => { controller.startConfiguredGame(); workers.at(-1)!.ready(); };
  const latest = () => workers.at(-1)!;
  return { controller, workers, start, latest, state: controller.getSnapshot, stop };
}

test('UCI gates options, newgame, readiness and search, ignoring premature/duplicate handshakes', t => {
  const workers: FakeWorker[] = []; const states: string[] = []; const moves: string[] = [];
  const engine = new StockfishEngine(() => { const w = new FakeWorker(); workers.push(w); return w; }, s => states.push(s), m => moves.push(m));
  t.after(() => engine.cancel());
  engine.prepare(8, { fen: new Chess().fen(), position: 'position startpos' }); const w = workers[0];
  assert.deepEqual(w.sent, ['uci']); w.emit('readyok\nbestmove e2e4'); assert.deepEqual(moves, []);
  w.emit('uciok\nuciok'); assert.deepEqual(w.sent, ['uci', 'setoption name Skill Level value 8', 'ucinewgame', 'isready']);
  w.emit('readyok\nreadyok'); assert.deepEqual(w.sent.slice(-2), ['position startpos', 'go movetime 500']);
  assert.equal(states.at(-1), 'thinking');
  w.emit('info depth 1\nbestmove e2e4 ponder e7e5\nbestmove d2d4'); assert.deepEqual(moves, ['e2e4']); assert.equal(states.at(-1), 'ready');
});
for (const [difficulty, config] of Object.entries(DIFFICULTIES)) test(`all difficulty options initialize before go: ${difficulty}`, t => {
  const f = fixture(t); f.controller.setDifficulty(difficulty as keyof typeof DIFFICULTIES); f.latest().ready(); f.start();
  assert(f.latest().sent.includes(`setoption name Skill Level value ${config.skill}`));
  assert(f.controller.drop('e2', 'e4')); const w = f.latest();
  assert(w.sent.indexOf(`setoption name Skill Level value ${config.skill}`) < w.sent.indexOf('go movetime 500'));
});
test('white/black turns, legal and illegal drops, null squares and game history sync', t => {
  const f = fixture(t); f.start(); const initial = f.state().position;
  assert.equal(f.controller.drop('e2', 'e5'), false); assert.equal(f.controller.drop('a9', 'a4'), false);
  assert.equal(f.controller.drop('e7', 'e5'), false); assert.equal(f.controller.drop('e2', null), false); assert.equal(f.state().position, initial);
  assert(f.controller.drop('e2', 'e4')); assert(f.state().isAiThinking); assert.equal(f.controller.drop('d2', 'd4'), false);
  f.latest().emit('bestmove e7e5'); assert.deepEqual(f.state().moveHistory, ['e4', 'e5']); assert(f.state().canMove);
  assert.deepEqual(f.state().lastMove, { from: 'e7', to: 'e5' });
  assert(f.latest().sent.some(s => s.startsWith('position fen ') && s.endsWith(' moves e2e4')));
});
test('black starts only after ready, Stockfish opens once; rematch retains color', t => {
  const f = fixture(t, { black: true }); f.controller.startConfiguredGame();
  assert(f.state().isAiThinking); assert.equal(f.controller.drop('e7', 'e5'), false); assert(!f.latest().sent.some(s => s.startsWith('go ')));
  f.latest().ready(); f.latest().emit('bestmove e2e4'); assert(f.controller.drop('e7', 'e5'));
  f.latest().emit('bestmove g1f3'); assert.equal(f.state().playerColor, 'b');
  f.controller.rematchGame(); assert.equal(f.state().orientation, 'black'); f.latest().ready();
  assert.equal(f.latest().sent.filter(s => s.startsWith('go ')).length, 1); assert.equal(f.state().moveHistory.length, 0);
});
for (const [random, color] of [[0, 'w'], [.99, 'b']] as const) test(`random color resolves to ${color} and rematch preserves it`, t => {
  const f = fixture(t, { random: () => random }); f.controller.setPlayerColorChoice('random'); f.start();
  assert.equal(f.state().playerColor, color); f.controller.rematchGame(); assert.equal(f.state().playerColor, color);
});
for (const action of ['new-game', 'rematch', 'undo', 'settings'] as const) test(`queued old bestmove/ready/error cannot affect a ${action} session, including identical FEN`, t => {
  const f = fixture(t, { black: true }); f.start(); const old = f.latest(); const queued = old.queued(); const crash = old.onerror;
  if (action === 'undo') { old.emit('bestmove e2e4'); f.controller.drop('e7', 'e5'); f.controller.undoMove(); }
  else if (action === 'rematch') f.controller.rematchGame();
  else { f.controller.openNewGameSetup(); if (action === 'settings') f.controller.setDifficulty('master'); f.latest().ready(); f.controller.startConfiguredGame(); }
  assert(old.terminated); const before = f.state().position;
  queued('uciok\nreadyok\nbestmove e2e4'); crash?.({} as ErrorEvent);
  assert.equal(f.state().position, before); assert(!f.state().engineError);
  f.latest().ready(); if (f.state().isAiThinking) f.latest().emit('bestmove e2e4');
  assert.equal(f.state().moveHistory.length, 1);
});
test('rapid resets and strict-mode connect/disconnect invalidate every abandoned Worker', t => {
  const f = fixture(t); f.start(); f.controller.drop('e2', 'e4'); const old = f.latest().queued();
  f.stop(); f.controller.connect(); f.controller.openNewGameSetup(); f.controller.setDifficulty('master');
  assert(f.workers.slice(0, -1).every(w => w.terminated)); old('bestmove e7e5');
  assert.equal(f.state().moveHistory.length, 1); assert(f.state().showSetup); f.latest().ready(); assert(f.state().engineReady);
});
for (const output of ['bestmove (none)', 'bestmove 0000', 'bestmove e7e9', 'bestmove', 'bestmove e7e4']) test(`invalid engine move recovers without corrupting board: ${output}`, t => {
  const f = fixture(t); f.start(); f.controller.drop('e2', 'e4'); const before = f.state().position;
  f.latest().emit(output); assert(f.state().engineError); assert(!f.state().isAiThinking); assert.equal(f.state().position, before);
  f.controller.retryEngine(); f.latest().ready(); f.latest().emit('bestmove e7e5'); assert(f.state().canMove);
});
test('Worker error/messageerror clears thinking; retry resumes exact position and can return to setup', t => {
  const f = fixture(t); f.start(); f.controller.drop('e2', 'e4'); f.latest().crash();
  assert(f.state().engineError); assert(!f.state().isAiThinking); assert.equal(f.state().status.label, 'Engine error');
  f.controller.retryEngine(); f.latest().onmessageerror?.({} as MessageEvent); assert(f.state().engineError);
  f.controller.openNewGameSetup(); f.latest().ready(); assert(f.state().showSetup); f.start(); assert(f.state().canMove);
});
test('factory/postMessage failures are recoverable, not uncaught startup errors', t => {
  let fails = true; const w = new FakeWorker();
  const c = new GameController(() => { if (fails) throw Error('Cannot create worker'); return w; }); const stop = c.connect(); t.after(stop);
  assert(c.getSnapshot().engineError); fails = false; c.startConfiguredGame(); w.ready(); assert(c.getSnapshot().engineReady);
  w.throwOnSend = true; c.startConfiguredGame(); assert(c.getSnapshot().engineError);
});
test('initialization and search watchdogs fail closed; old timers cannot fail a replacement session', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const workers: FakeWorker[] = []; const c = new GameController(() => { const w = new FakeWorker(); workers.push(w); return w; }, undefined, undefined, { init: 10, search: 20 });
  t.after(c.connect()); t.mock.timers.tick(10); assert(c.getSnapshot().engineError);
  c.retryEngine(); workers.at(-1)!.ready(); c.startConfiguredGame(); workers.at(-1)!.ready(); c.drop('e2', 'e4');
  t.mock.timers.tick(20); assert(c.getSnapshot().engineError); assert(!c.getSnapshot().isAiThinking);
  c.openNewGameSetup(); c.setDifficulty('master'); workers.at(-1)!.ready(); t.mock.timers.tick(10); assert(c.getSnapshot().engineReady);
});
test('undo during search rewinds one ply; completed pair rewinds two; no stale reply can restore them', t => {
  const f = fixture(t); f.start(); f.controller.drop('e2', 'e4'); const queued = f.latest().queued();
  f.controller.undoMove(); queued('bestmove e7e5'); f.latest().ready(); assert.equal(f.state().moveHistory.length, 0); assert(f.state().canMove);
  f.controller.drop('d2', 'd4'); f.latest().emit('bestmove d7d5'); f.controller.undoMove(); f.latest().ready();
  assert.deepEqual(f.state().moveHistory, []); assert.equal(f.state().lastMove, null);
});
test('black undo returns to its previous decision and can rewind the first engine opening safely', t => {
  const f = fixture(t, { black: true }); f.start(); f.latest().emit('bestmove e2e4'); f.controller.drop('e7', 'e5'); f.latest().emit('bestmove g1f3');
  f.controller.undoMove(); f.latest().ready(); assert.deepEqual(f.state().moveHistory, ['e4']); assert(f.state().canMove);
  f.controller.undoMove(); f.latest().ready(); assert(f.state().isAiThinking); f.latest().emit('bestmove d2d4'); assert(f.state().canMove);
});
for (const piece of ['q', 'r', 'b', 'n'] as const) for (const black of [false, true]) test(`capture promotion ${piece} as ${black ? 'black' : 'white'}`, t => {
  const f = fixture(t, { black, fen: black ? 'k7/8/8/8/8/8/1p6/R6K b - - 0 1' : 'k6r/6P1/8/8/8/8/8/K7 w - - 0 1' });
  f.start(); const from = black ? 'b2' : 'g7', to = black ? 'a1' : 'h8';
  const before = f.state().position; assert(f.controller.drop(from, to)); assert(f.state().pendingPromotion); assert.equal(f.state().position, before);
  f.controller.selectPromotionPiece(piece); assert.equal(f.state().pendingPromotion, null); assert.equal(new Chess(f.state().position).get(to)?.type, piece);
  const once = f.state().position; f.controller.selectPromotionPiece('q'); assert.equal(f.state().position, once);
});
test('promotion checking SAN and new game cancelling a pending selection', t => {
  const f = fixture(t, { fen: '7k/P7/8/8/8/8/8/7K w - - 0 1' }); f.start(); assert(f.controller.drop('a7', 'a8'));
  f.controller.openNewGameSetup(); f.controller.selectPromotionPiece('q'); assert.equal(f.state().moveHistory.length, 0); assert.equal(f.state().pendingPromotion, null);
  f.latest().ready(); f.start(); f.controller.drop('a7', 'a8'); f.controller.selectPromotionPiece('q'); assert(f.state().moveHistory[0].endsWith('+'));
});
test('engine underpromotion is legal and missing promotion suffix fails closed', t => {
  for (const move of ['a7a8n', 'a7a8']) {
    const f = fixture(t, { black: true, fen: '7k/P7/8/8/8/8/8/7K w - - 0 1' }); f.start(); f.latest().emit('bestmove ' + move);
    if (move.endsWith('n')) assert.equal(new Chess(f.state().position).get('a8')?.type, 'n');
    else assert(f.state().engineError);
  }
});
test('checkmate, stalemate, insufficient material, repetition and fifty-move rule use chess.js outcomes', () => {
  const mate = new Chess(); ['f3','e5','g4','Qh4#'].forEach(m => mate.move(m));
  assert.equal(gameResult(mate, 'w')?.title, 'You lose'); assert.equal(gameResult(mate, 'b')?.title, 'You win!');
  for (const [fen, description] of [
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'Stalemate'],
    ['7k/8/6K1/8/8/8/8/8 w - - 0 1', 'Insufficient material'],
    ['8/8/8/8/8/6k1/7r/K7 w - - 100 51', '50-move rule'],
  ]) assert.equal(gameResult(new Chess(fen), 'w')?.description, description);
  const repeated = new Chess(); for (let i=0;i<2;i++) ['Nf3','Nf6','Ng1','Ng8'].forEach(m => repeated.move(m));
  assert.equal(gameResult(repeated, 'w')?.description, 'Threefold repetition');
});
test('terminal player move starts no engine search; rematch/new game reset result and history', t => {
  const f = fixture(t, { fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1' }); f.start();
  assert(f.controller.drop('g6', 'g7')); assert.equal(f.state().result?.description, 'Checkmate'); assert(!f.state().canMove);
  assert(!f.latest().sent.includes('go movetime 500')); assert.equal(f.controller.drop('f6', 'f7'), false);
  f.controller.rematchGame(); f.latest().ready(); assert.equal(f.state().result, null); assert.deepEqual(f.state().moveHistory, []);
});

test('engine failure during pending promotion dismisses the modal and permits retry without a move', t => {
  const f = fixture(t, { fen: 'k6r/6P1/8/8/8/8/8/K7 w - - 0 1' }); f.start();
  f.controller.drop('g7', 'h8'); const before = f.state().position; f.latest().crash();
  assert.equal(f.state().pendingPromotion, null); assert(f.state().engineError); assert.equal(f.state().position, before);
  f.controller.retryEngine(); f.latest().ready(); assert(f.state().canMove); assert(f.controller.drop('g7', 'h8'));
});
test('terminal positions never queue an engine search even when playing black', t => {
  for (const fen of ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', '7k/8/6K1/8/8/8/8/8 b - - 0 1']) {
    const f = fixture(t, { fen, black: true }); f.start(); assert(f.state().result); assert(!f.state().isAiThinking);
    assert(!f.latest().sent.some(s => s.startsWith('go ')));
  }
});
test('dispose detaches handlers and invalidates already queued callbacks without notifying subscribers', t => {
  const f = fixture(t); f.start(); f.controller.drop('e2', 'e4'); const w = f.latest(); const queued = w.queued(); let calls = 0;
  f.controller.subscribe(() => { calls++; }); f.stop(); queued('bestmove e7e5'); assert.equal(calls, 0);
  assert(w.terminated); assert.equal(w.onmessage, null); assert.equal(w.onerror, null); assert.equal(w.onmessageerror, null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { GameController } from '../src/game/controller.ts';
import { GameSetup } from '../src/ui/GameSetup.tsx';
import { PromotionDialog } from '../src/ui/PromotionDialog.tsx';
import { GameResultDialog } from '../src/ui/GameResultDialog.tsx';
import { Header } from '../src/ui/Header.tsx';
import { KeyboardMove } from '../src/ui/KeyboardMove.tsx';
import { GamePanel } from '../src/ui/GamePanel.tsx';
import { ProgressStore } from '../src/progress/store.ts';
import { manageDialogFocus } from '../src/ui/dialog-focus.ts';
import { moveCoordinates, describePosition } from '../src/ui/keyboard-move.ts';
const noop = () => {};
const view = () => new GameController(() => { throw Error('SSR must not start a Worker'); }).getSnapshot();

test('setup dialog is labelled, modal and exposes pressed color/skill selections and loading/retry states', () => {
  const html = render(h(GameSetup, { view: view(), onColor: noop, onDifficulty: noop, onStart: noop }));
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="setup-title"/);
  assert.match(html, /id="setup-title">Play vs Stockfish/); assert.match(html, /aria-describedby="setup-help"/);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length, 2); assert.equal((html.match(/aria-pressed="false"/g)||[]).length, 6);
  assert.match(html, /disabled="">Loading engine/); assert.match(html, /role="status"/);
  const error = render(h(GameSetup, { view: { ...view(), engineError: true }, onColor: noop, onDifficulty: noop, onStart: noop }));
  assert.match(error, />Retry engine<\/button>/); assert.doesNotMatch(error, /disabled=/);
});
test('promotion dialog names all four actions for both colors without reading decorative glyphs', () => {
  for (const color of ['w','b'] as const) {
    const html = render(h(PromotionDialog, { color, onSelect: noop }));
    assert.match(html, /aria-labelledby="promotion-title"/); assert.match(html, /aria-describedby="promotion-help"/);
    assert.equal((html.match(/class="promotion-option"/g)||[]).length, 4);
    for(const name of ['Queen','Rook','Bishop','Knight']) assert(html.includes(`<span>${name}</span>`));
    assert.match(html, /aria-hidden="true"/);
  }
});
test('result dialog retains actions and offers review without changing completed game state', () => {
  const current = { ...view(), result: {title:'You win!', description:'Checkmate',symbol:'♔'} };
  const html = render(h(GameResultDialog, { view: current, onRematch: noop, onSettings: noop, onReview: noop }));
  assert.match(html, /aria-labelledby="result-title"/); assert.match(html, /aria-describedby="result-description"/);
  for(const text of ['Rematch','Change settings','Review game']) assert(html.includes(`>${text}</button>`));
  assert.equal(current.result.title,'You win!');
});
test('header uses a neutral badge and hides decorative chess symbol from its accessible name', () => {
  const html = render(h(Header, {onFlip:noop})); assert(!html.includes('V2 Preview')); assert(html.includes('Local play'));
  assert.match(html, /aria-label="Flip board"/); assert.match(html, /class="brand-mark" aria-hidden="true"/);
});
test('keyboard move form labels coordinates, avoids autoFocus, and disables moves when not permitted', () => {
  for(const canMove of [true,false]) {
    const html = render(h(KeyboardMove,{position:view().position,canMove,onMove:()=>false}));
    assert.match(html, /<summary>Keyboard moves<\/summary>/); assert.match(html, /<label>From<input/); assert.match(html, /<label>To<input/);
    assert.match(html, /aria-describedby="keyboard-help board-position"/); assert.match(html, /role="status"/);
    assert.equal(html.includes('<fieldset disabled=""'), !canMove); assert.doesNotMatch(html,/autofocus/i);
  }
});
test('keyboard coordinate syntax accepts either case; chess legality stays in the unchanged controller', () => {
  assert.deepEqual(moveCoordinates(' E2 ', 'e4'),{from:'e2',to:'e4'});
  for(const [from,to] of [['e9','e4'],['','a1'],['<script>','a1'],['a1','z3']]) assert.equal(moveCoordinates(from,to),null);
  const description=describePosition(view().position); assert(description.includes('White king on e1')); assert(description.includes('Black king on e8'));
});
test('panel announces game status, exposes keyboard scrolling and keeps history/session notice accessible', () => {
  const progress=new ProgressStore(()=>{throw Error('blocked');});progress.load();
  const html=render(h(GamePanel,{view:{...view(),engineError:true},progress,onRetry:noop,onNewGame:noop,onUndo:noop}));
  assert.match(html,/class="game-status" role="status" aria-atomic="true"/);assert.match(html,/class="moves-list" role="region" aria-labelledby="moves-title" tabindex="0"/);
  assert.match(html,/>Retry engine<\/button>/);assert.match(html,/role="progressbar"/);assert(html.includes('session-only'));assert(html.includes('Recent games (0)'));
});

class FocusNode {
  hidden=false;isConnected=true;disabled=false;inert=false;doc: FocusDocument;
  constructor(doc:FocusDocument){this.doc=doc;}
  focus(){this.doc.activeElement=this;}
  matches(){return this.disabled;}
  closest(){return this.inert ? this : null;}
}
class FocusDocument {
  activeElement:FocusNode|null=null;listeners=new Map<string,(e:FocusEvent)=>void>();
  addEventListener(name:string,fn:(e:FocusEvent)=>void){this.listeners.set(name,fn);}
  removeEventListener(name:string){this.listeners.delete(name);}
}
function focusFixture(){
  const doc=new FocusDocument(),previous=new FocusNode(doc),fallback=new FocusNode(doc),first=new FocusNode(doc),last=new FocusNode(doc);
  previous.focus();const listeners=new Map<string,(event:KeyboardEvent)=>void>();
  const root={ownerDocument:doc,querySelectorAll:()=>[first,last],contains:(n:unknown)=>n===first||n===last||n===root,
    focus:()=>{doc.activeElement=root as unknown as FocusNode;},
    addEventListener:(name:string,fn:(event:KeyboardEvent)=>void)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)};
  const cleanup=manageDialogFocus(root as unknown as HTMLElement,()=>fallback as unknown as HTMLElement);
  const key=(shiftKey=false)=>{let prevented=false;listeners.get('keydown')!({key:'Tab',shiftKey,preventDefault:()=>{prevented=true;}} as KeyboardEvent);return prevented;};
  return{doc,previous,fallback,first,last,root,key,cleanup,listeners};
}
test('dialog focuses first control and wraps forward/backward keyboard navigation',()=>{
  const f=focusFixture();assert.equal(f.doc.activeElement,f.first);f.last.focus();assert(f.key());assert.equal(f.doc.activeElement,f.first);
  assert(f.key(true));assert.equal(f.doc.activeElement,f.last);f.first.focus();assert.equal(f.key(),false);f.cleanup();
});
test('dialog contains programmatic focus escape, restores opener, and removes listeners',()=>{
  const f=focusFixture();f.previous.focus();f.doc.listeners.get('focusin')!({target:f.previous} as unknown as FocusEvent);
  assert.equal(f.doc.activeElement,f.first);f.cleanup();assert.equal(f.doc.activeElement,f.previous);assert.equal(f.listeners.size,0);assert.equal(f.doc.listeners.size,0);
});
for(const reason of ['removed','disabled','inert'] as const)test(`dialog restores safe fallback if opener is ${reason}`,()=>{
  const f=focusFixture();if(reason==='removed')f.previous.isConnected=false;else if(reason==='disabled')f.previous.disabled=true;else f.previous.inert=true;
  f.cleanup();assert.equal(f.doc.activeElement,f.fallback);
});

test('journey exposes derived XP/level and keyboard-focusable history without changing stored schema', async()=>{
  const {JourneyCard}=await import('../src/progress/JourneyCard.tsx');
  let raw:string|null=null;const store=new ProgressStore(()=>({getItem:()=>raw,setItem:(_key,value)=>{raw=value;}}));
  store.record({id:'ui-game',date:'2026-10-17T12:00:00.000Z',result:'win',playerColor:'w',difficulty:'casual',moves:20});
  const html=render(h(JourneyCard,{store}));assert.match(html,/aria-label="Player journey"/);assert.match(html,/aria-valuenow="30"/);
  assert.match(html,/aria-valuetext="Level 1, 70 XP to level 2"/);assert.match(html,/tabindex="0" aria-label="Completed games"/);
  assert(html.includes('1 games'));assert(html.includes('100% win rate'));assert(html.includes('Recent games (1)'));
  assert(raw);assert(!raw.includes('currentLevel'));
});
test('focus trap handles a dialog with no enabled controls',()=>{
  const f=focusFixture();f.cleanup();f.root.querySelectorAll=()=>[];
  const cleanup=manageDialogFocus(f.root as unknown as HTMLElement,()=>f.fallback as unknown as HTMLElement);
  assert(f.key());assert.equal(f.doc.activeElement,f.root);cleanup();
});

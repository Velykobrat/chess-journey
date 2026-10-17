import type { GameController } from "../game/controller.ts";
export type GameView = ReturnType<GameController["getSnapshot"]>;

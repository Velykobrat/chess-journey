export const createStockfishWorker = () => {
  return new Worker("/stockfish/stockfish-19-lite-single.js");
};
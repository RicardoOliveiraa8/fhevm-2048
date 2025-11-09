"use client";

import { useEffect, useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEGame2048 } from "~~/hooks/useFHEGame2048";

const GRID_SIZE = 4;

export const FHEGame2048 = () => {
  const { isConnected, chain } = useAccount();
  const activeChain = chain?.id;
  const ethProvider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);
  const testChains = { 11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` };

  const { instance: fheInstance } = useFhevm({
    provider: ethProvider,
    chainId: activeChain,
    initialMockChains: testChains,
    enabled: true,
  });

  const fheGame = useFHEGame2048({
    instance: fheInstance,
    initialMockChains: testChains,
  });

  const [board, setBoard] = useState<number[][]>(
    Array(GRID_SIZE)
      .fill(0)
      .map(() => Array(GRID_SIZE).fill(0)),
  );
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [message, setMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false);

  function generateEmptyBoard() {
    const b = Array(GRID_SIZE)
      .fill(0)
      .map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(b);
    addRandomTile(b);
    return b;
  }

  function addRandomTile(b: number[][]) {
    const emptyCells: [number, number][] = [];
    b.forEach((row, r) => row.forEach((cell, c) => cell === 0 && emptyCells.push([r, c])));
    if (!emptyCells.length) return;
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  const slide = (arr: number[]) => {
    const filtered = arr.filter(n => n !== 0);
    const merged: number[] = [];
    let skip = false;
    for (let i = 0; i < filtered.length; i++) {
      if (skip) {
        skip = false;
        continue;
      }
      if (filtered[i] === filtered[i + 1]) {
        merged.push(filtered[i] * 2);
        setScore(s => s + filtered[i] * 2);
        skip = true;
      } else {
        merged.push(filtered[i]);
      }
    }
    while (merged.length < GRID_SIZE) merged.push(0);
    return merged;
  };

  const checkWin = (b: number[][]) => b.some(row => row.some(cell => cell >= 2048));

  const isGameOver = (b: number[][]) => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (b[r][c] === 0) return false;
        if (r < GRID_SIZE - 1 && b[r][c] === b[r + 1][c]) return false;
        if (c < GRID_SIZE - 1 && b[r][c] === b[r][c + 1]) return false;
      }
    }
    return true;
  };

  const handleMove = (dir: "up" | "down" | "left" | "right") => {
    if (!gameStarted || gameOver) return;
    let newBoard = board.map(row => [...row]);
    let moved = false;

    const rotateCW = (b: number[][]) => b[0].map((_, i) => b.map(r => r[i]).reverse());
    const rotateCCW = (b: number[][]) => rotateCW(rotateCW(rotateCW(b)));

    if (dir === "up") newBoard = rotateCCW(newBoard);
    else if (dir === "down") newBoard = rotateCW(newBoard);

    for (let i = 0; i < GRID_SIZE; i++) {
      const row = dir === "right" ? [...newBoard[i]].reverse() : [...newBoard[i]];
      const newRow = slide(row);
      if (dir === "right") newRow.reverse();
      if (newRow.toString() !== newBoard[i].toString()) moved = true;
      newBoard[i] = newRow;
    }

    if (dir === "up") newBoard = rotateCW(newBoard);
    else if (dir === "down") newBoard = rotateCCW(newBoard);

    if (moved) {
      addRandomTile(newBoard);
      setBoard(newBoard);

      if (!hasWon && checkWin(newBoard)) {
        setHasWon(true);
        setMessage("🎉 You Win! Keep going or restart!");
      }
    } else if (isGameOver(newBoard)) {
      setGameOver(true);
      handleSubmitScore();
    }
  };

  const handleSubmitScore = async () => {
    if (!fheGame.canSubmit) return;
    setMessage("🔒 Encrypting your score and saving on-chain...");
    try {
      await fheGame.submitEncryptedScore(score);
      setMessage("✅ Score securely stored!");
      await fheGame.refreshScores?.();
    } catch {
      setMessage("⚠️ Submission failed. Try again later.");
    }
  };

  const handleDecryptScores = async () => {
    if (!fheGame.canDecryptScores) return;
    setMessage("🔓 Decrypting leaderboard...");
    await fheGame.decryptScores?.();
  };

  const startGame = () => {
    setGameStarted(true);
    setBoard(generateEmptyBoard());
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    setMessage("🕹️ Game started! Use arrow keys to move tiles.");
  };

  const resetGame = () => {
    startGame();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          handleMove("up");
          break;
        case "ArrowDown":
          handleMove("down");
          break;
        case "ArrowLeft":
          handleMove("left");
          break;
        case "ArrowRight":
          handleMove("right");
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!isConnected) {
    return (
      <div className="h-[calc(100vh-100px)] w-full flex items-center justify-center text-purple-100">
        <motion.div
          className="h-[400px] w-[540px] bg-gradient-to-b from-purple-900/30 to-black/70 border border-purple-400 rounded-2xl p-12 text-center shadow-2xl backdrop-blur-md"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-6xl mb-6 animate-pulse">🧩</div>
          <h2 className="text-3xl font-extrabold mb-3 text-purple-300">Connect Your Wallet</h2>
          <p className="text-purple-200 mb-6">Join the encrypted 2048 leaderboard powered by FHE!</p>
          <RainbowKitCustomConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-full text-purple-100">
      <header className="flex items-center justify-between mb-8">
        <h1 className="w-full text-center text-4xl font-extrabold text-purple-400 drop-shadow-lg">⚡ FHEVM 2048</h1>
      </header>

      <div className="max-w-[900px] mx-auto px-6 py-10">
        {/* === Board === */}
        <section className="bg-gradient-to-b from-purple-900/40 to-black/50 border border-purple-700 rounded-2xl p-6 shadow-xl mb-8 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-purple-300">🧩 Play</h2>
            <div className="text-lg font-bold text-purple-200">Score: {gameStarted ? score : 0}</div>
          </div>

          <div className="grid gap-[6px] bg-purple-800/30 rounded-xl p-3 mx-auto w-fit shadow-inner">
            {board.map((row, r) => (
              <div key={r} className="flex gap-[6px]">
                {row.map((cell, c) => (
                  <motion.div
                    key={c}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-bold text-2xl transition-all
                      ${!gameStarted || cell === 0 ? "bg-purple-950/40 text-transparent" : "bg-gradient-to-br from-purple-400 to-amber-300 text-black shadow-lg"}`}
                    layout
                    transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  >
                    {gameStarted ? cell || "" : ""}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {gameOver && (
            <div className="mt-6 text-center text-xl font-bold text-purple-300 animate-pulse">
              💀 Game Over — Final Score: {score}
            </div>
          )}

          {hasWon && (
            <div className="mt-6 text-center text-xl font-bold text-green-300 animate-pulse">
              🎉 You Win! 2048 Achieved!
            </div>
          )}

          {!gameStarted ? (
            <button
              onClick={startGame}
              className="px-5 py-2 rounded-lg border border-purple-400 text-purple-200 hover:bg-purple-500 hover:text-black transition shadow-md"
            >
              🕹️ Start
            </button>
          ) : (
            <button
              onClick={resetGame}
              className="px-5 py-2 rounded-lg border border-purple-400 text-purple-200 hover:bg-purple-500 hover:text-black transition shadow-md mt-4"
            >
              🔄 Restart
            </button>
          )}
        </section>

        {/* === Scoreboard === */}
        <section className="bg-gradient-to-b from-purple-950/60 via-black/50 to-purple-900/70 border border-purple-700 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h3 className="text-lg font-bold text-amber-300 drop-shadow-md">🏆 Leaderboard — Top Scores</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-80 border border-purple-800 rounded-xl divide-y divide-purple-800">
            {(fheGame.encryptedScores ?? []).map((item: string, idx: number) => {
              const decrypted = fheGame.decryptedScores?.[item];
              return (
                <div
                  key={idx}
                  className="w-[800px] flex items-center justify-between px-4 py-2 hover:bg-purple-900/50 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-mono">#{idx + 1}</span>
                    {decrypted === undefined ? (
                      <span className="text-purple-500 italic flex items-center gap-1">
                        🔒 <span>Hidden</span>
                      </span>
                    ) : (
                      <span className="text-amber-300 font-semibold flex items-center gap-1">
                        💫 {Number(decrypted)}
                      </span>
                    )}
                  </div>
                  <div className="text-purple-200 text-sm italic">
                    {decrypted === undefined ? "Score encrypted" : "Decrypted"}
                  </div>
                </div>
              );
            })}
            {(!fheGame.encryptedScores || fheGame.encryptedScores.length === 0) && (
              <div className="col-span-full text-center text-purple-500 italic py-6">⏳ Leaderboard is empty.</div>
            )}
          </div>

          <button
            onClick={handleDecryptScores}
            disabled={fheGame.isDecryptingScores || (fheGame.encryptedScores?.length ?? 0) === 0}
            className={`self-start sm:self-auto px-5 mt-6 py-2 rounded-lg border border-amber-300 text-amber-200 hover:bg-amber-400 hover:text-black font-semibold transition-all shadow-md ${
              fheGame.isDecryptingScores || (fheGame.encryptedScores?.length ?? 0) === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {fheGame.isDecryptingScores ? "⏳ Decrypting..." : "🔓 Decrypt Scores"}
          </button>
        </section>
      </div>
    </div>
  );
};

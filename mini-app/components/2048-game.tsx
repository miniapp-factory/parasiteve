"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Share } from "@/components/share";
import { url } from "@/lib/metadata";

const GRID_SIZE = 4;
const TILE_VALUES = [2, 4];
const TILE_PROBABILITIES = [0.9, 0.1];

function getRandomTile() {
  return Math.random() < TILE_PROBABILITIES[0] ? 2 : 4;
}

function cloneGrid(grid: number[][]) {
  return grid.map(row => [...row]);
}

function addRandomTile(grid: number[][]) {
  const empty: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = cloneGrid(grid);
  newGrid[r][c] = getRandomTile();
  return newGrid;
}

function slideAndMerge(row: number[]) {
  const filtered = row.filter(v => v !== 0);
  const merged: number[] = [];
  let skip = false;
  for (let i = 0; i < filtered.length; i++) {
    if (skip) {
      skip = false;
      continue;
    }
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      skip = true;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  return merged;
}

function move(grid: number[][], direction: "up" | "down" | "left" | "right") {
  let newGrid = cloneGrid(grid);
  let moved = false;
  let scoreDelta = 0;

  const rotate = (g: number[][], times: number) => {
    let res = g;
    for (let t = 0; t < times; t++) {
      const newG: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          newG[c][GRID_SIZE - 1 - r] = res[r][c];
        }
      }
      res = newG;
    }
    return res;
  };

  // Normalize to left move
  const times = direction === "up" ? 1 : direction === "right" ? 2 : direction === "down" ? 3 : 0;
  newGrid = rotate(newGrid, times);

  for (let r = 0; r < GRID_SIZE; r++) {
    const original = newGrid[r];
    const merged = slideAndMerge(original);
    if (!moved && !merged.every((v, i) => v === original[i])) moved = true;
    newGrid[r] = merged;
    scoreDelta += merged.reduce((a, b) => a + b, 0) - original.reduce((a, b) => a + b, 0);
  }

  newGrid = rotate(newGrid, (4 - times) % 4);
  return { newGrid, moved, scoreDelta };
}

export function Game2048() {
  const [grid, setGrid] = useState<number[][]>(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    let g = addRandomTile(addRandomTile(grid));
    setGrid(g);
  }, []);

  const handleMove = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (gameOver) return;
    const { newGrid, moved, scoreDelta } = move(grid, dir);
    if (!moved) return;
    let updatedGrid = addRandomTile(newGrid);
    setGrid(updatedGrid);
    setScore(prev => prev + scoreDelta);
    if (updatedGrid.some(row => row.includes(2048))) setWon(true);
    if (!updatedGrid.some(row => row.includes(0)) && !canMove(updatedGrid)) setGameOver(true);
  }, [grid, gameOver]);

  const canMove = (g: number[][]) => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (g[r][c] === 0) return true;
        if (c + 1 < GRID_SIZE && g[r][c] === g[r][c + 1]) return true;
        if (r + 1 < GRID_SIZE && g[r][c] === g[r + 1][c]) return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") handleMove("up");
      if (e.key === "ArrowDown") handleMove("down");
      if (e.key === "ArrowLeft") handleMove("left");
      if (e.key === "ArrowRight") handleMove("right");
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [handleMove]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-4 gap-2">
        {grid.flat().map((val, idx) => (
          <div
            key={idx}
            className={`w-16 h-16 flex items-center justify-center rounded-md text-2xl font-bold ${
              val === 0
                ? "bg-gray-200"
                : val <= 4
                ? "bg-yellow-200"
                : val <= 8
                ? "bg-yellow-300"
                : val <= 16
                ? "bg-yellow-400"
                : val <= 32
                ? "bg-yellow-500"
                : val <= 64
                ? "bg-yellow-600"
                : "bg-yellow-700"
            }`}
          >
            {val !== 0 ? val : null}
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <Button onClick={() => handleMove("up")}>↑</Button>
        <Button onClick={() => handleMove("left")}>←</Button>
        <Button onClick={() => handleMove("right")}>→</Button>
        <Button onClick={() => handleMove("down")}>↓</Button>
      </div>
      <div className="text-xl">Score: {score}</div>
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl font-bold">{won ? "You Win!" : "Game Over"}</div>
          <Share text={`I scored ${score} in 2048! ${url}`} />
        </div>
      )}
    </div>
  );
}

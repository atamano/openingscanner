"use client";

import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chessboard = dynamic(
  () => import("react-chessboard").then((m) => m.Chessboard),
  { ssr: false, loading: () => <BoardSkeleton /> },
);

function BoardSkeleton() {
  return (
    <div className="aspect-square w-full animate-warm-pulse rounded-md bg-muted" />
  );
}

export function fenFromMoves(moves: readonly string[]): string {
  const chess = new Chess();
  for (const san of moves) {
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess.fen();
}

interface ChessBoardProps {
  moves: readonly string[];
  orientation?: "white" | "black";
  id?: string;
}

export function ChessBoard({
  moves,
  orientation = "white",
  id,
}: ChessBoardProps) {
  const fen = useMemo(() => fenFromMoves(moves), [moves]);

  return (
    <div className="wood-frame rounded-lg p-1.5">
      <div className="aspect-square w-full overflow-hidden rounded-sm">
        <Chessboard
          options={{
            id: id ?? "repertoire-board",
            position: fen,
            boardOrientation: orientation,
            allowDragging: false,
            lightSquareStyle: { backgroundColor: "var(--color-board-light)" },
            darkSquareStyle: { backgroundColor: "var(--color-board-dark)" },
            boardStyle: {
              borderRadius: "0",
            },
            animationDurationInMs: 150,
          }}
        />
      </div>
    </div>
  );
}

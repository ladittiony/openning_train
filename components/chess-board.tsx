"use client"

import { useState, useCallback } from "react"
import { Chess } from "@/lib/chess"
import type { Square } from "@/lib/chess"

interface ChessBoardProps {
  game: Chess
  onMove: (from: Square, to: Square) => boolean
  disabled?: boolean
}

const PIECE_SYMBOLS: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const

export function ChessBoard({ game, onMove, disabled = false }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (disabled) {
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }
      
      const piece = game.get(square)

      // If a square is already selected
      if (selectedSquare) {
        // Try to make a move
        if (legalMoves.includes(square)) {
          const success = onMove(selectedSquare, square)
          if (success) {
            setSelectedSquare(null)
            setLegalMoves([])
            return
          }
        }
        
        // If clicking on own piece, select it instead
        if (piece && piece.color === game.turn()) {
          const moves = game.moves({ square })
          setSelectedSquare(square)
          setLegalMoves(moves.map((m) => m.to))
          return
        }

        // Deselect
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      // Select a piece if it belongs to the current player
      if (piece && piece.color === game.turn()) {
        const moves = game.moves({ square })
        setSelectedSquare(square)
        setLegalMoves(moves.map((m) => m.to))
      }
    },
    [game, selectedSquare, legalMoves, onMove, disabled]
  )

  const board = game.board()

  return (
    <div className="inline-block">
      {/* Top file labels */}
      <div className="flex">
        <div className="w-6" />
        {FILES.map((file) => (
          <div
            key={file}
            className="w-12 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium"
          >
            {file}
          </div>
        ))}
        <div className="w-6" />
      </div>

      {/* Board with rank labels */}
      <div className="flex">
        {/* Left rank labels */}
        <div className="flex flex-col">
          {RANKS.map((rank) => (
            <div
              key={rank}
              className="w-6 h-12 flex items-center justify-center text-xs text-muted-foreground font-medium"
            >
              {rank}
            </div>
          ))}
        </div>

        {/* Chess board */}
        <div className="border-2 border-foreground/20 rounded-sm overflow-hidden shadow-lg">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((piece, colIndex) => {
                const square = `${FILES[colIndex]}${RANKS[rowIndex]}` as Square
                const isLight = (rowIndex + colIndex) % 2 === 0
                const isSelected = selectedSquare === square
                const isLegalMove = legalMoves.includes(square)
                const hasPiece = piece !== null

                return (
                  <button
                    key={square}
                    onClick={() => handleSquareClick(square)}
                    className={`w-12 h-12 flex items-center justify-center text-3xl select-none relative transition-colors
                      ${isLight ? "bg-amber-100" : "bg-amber-700"}
                      ${isSelected ? "ring-2 ring-inset ring-blue-500 bg-blue-300/50" : ""}
                      ${isLegalMove && !hasPiece ? "cursor-pointer" : ""}
                      hover:brightness-95`}
                  >
                    {/* Legal move indicator */}
                    {isLegalMove && !hasPiece && (
                      <div className="absolute w-3 h-3 rounded-full bg-black/20" />
                    )}
                    {isLegalMove && hasPiece && (
                      <div className="absolute inset-0 ring-4 ring-inset ring-black/20 rounded-sm" />
                    )}
                    
                    {/* Piece */}
                    {piece && (
                      <span
                        className={`relative z-10 ${
                          piece.color === "w"
                            ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                            : "text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                        }`}
                      >
                        {PIECE_SYMBOLS[piece.color === "w" ? piece.type.toUpperCase() : piece.type]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Right rank labels */}
        <div className="flex flex-col">
          {RANKS.map((rank) => (
            <div
              key={rank}
              className="w-6 h-12 flex items-center justify-center text-xs text-muted-foreground font-medium"
            >
              {rank}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom file labels */}
      <div className="flex">
        <div className="w-6" />
        {FILES.map((file) => (
          <div
            key={file}
            className="w-12 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium"
          >
            {file}
          </div>
        ))}
        <div className="w-6" />
      </div>
    </div>
  )
}

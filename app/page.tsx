"use client"

// Chess viewer with PGN support and variations
import { useState, useRef, useCallback } from "react"
import { Chess } from "@/lib/chess"
import type { Square, MoveNode } from "@/lib/chess"
import { ChessBoard } from "@/components/chess-board"
import { PGNPanel } from "@/components/pgn-panel"
import { Button } from "@/components/ui/button"
import { Upload, RotateCcw } from "lucide-react"

interface GameState {
  fen: string
  moves: string[]
}

export default function ChessPage() {
  const [gameHistory, setGameHistory] = useState<GameState[]>([
    { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves: [] }
  ])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [moveTree, setMoveTree] = useState<MoveNode | null>(null)
  const [currentFen, setCurrentFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentState = gameHistory[currentMoveIndex + 1] || gameHistory[0]
  const displayFen = moveTree ? currentFen : currentState.fen
  const currentGame = new Chess(displayFen)
  const allMoves = gameHistory[gameHistory.length - 1].moves

  const isAtLatestPosition = !moveTree && (currentMoveIndex === allMoves.length - 1 || (currentMoveIndex === -1 && allMoves.length === 0))

  const handleMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (!isAtLatestPosition) {
        return false
      }

      const gameCopy = new Chess(currentState.fen)
      
      const piece = gameCopy.get(from)
      const isPromotion =
        piece?.type === "p" &&
        ((piece.color === "w" && to[1] === "8") ||
          (piece.color === "b" && to[1] === "1"))

      const move = gameCopy.move({
        from,
        to,
        promotion: isPromotion ? "q" : undefined,
      })

      if (move) {
        const newMoves = [...allMoves, move.san]
        const newState: GameState = {
          fen: gameCopy.fen(),
          moves: newMoves,
        }
        
        setGameHistory(prev => [...prev, newState])
        setCurrentMoveIndex(newMoves.length - 1)
        setCurrentFen(gameCopy.fen())
        return true
      }
      return false
    },
    [currentState.fen, allMoves, isAtLatestPosition]
  )

  const handleMoveSelect = useCallback((index: number) => {
    setCurrentMoveIndex(index)
    if (!moveTree) {
      const state = gameHistory[index + 1] || gameHistory[0]
      setCurrentFen(state.fen)
    }
  }, [gameHistory, moveTree])

  const handleVariationSelect = useCallback((fen: string) => {
    setCurrentFen(fen)
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        
        // Parse with variations
        const tree = Chess.parsePgnWithVariations(content)
        if (tree) {
          setMoveTree(tree)
          setCurrentFen(tree.fen)
        }
        
        // Also load main line for basic navigation
        const newGame = new Chess()
        const success = newGame.loadPgn(content)
        if (success) {
          const moves = newGame.history()
          
          const newHistory: GameState[] = [
            { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves: [] }
          ]
          
          const replayGame = new Chess()
          const movesAccum: string[] = []
          
          for (const san of moves) {
            const result = replayGame.loadPgn(movesAccum.concat(san).join(" "))
            if (result) {
              movesAccum.push(san)
              newHistory.push({
                fen: replayGame.fen(),
                moves: [...movesAccum],
              })
            }
          }
          
          setGameHistory(newHistory)
          setCurrentMoveIndex(movesAccum.length - 1)
          if (movesAccum.length > 0) {
            setCurrentFen(newHistory[newHistory.length - 1].fen)
          }
        }
      }
      reader.readAsText(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleReset = () => {
    setGameHistory([
      { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves: [] }
    ])
    setCurrentMoveIndex(-1)
    setMoveTree(null)
    setCurrentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto h-[calc(100vh-3rem)] flex gap-6">
        <div className="flex-1 flex flex-col items-center justify-center">
          <ChessBoard 
            game={currentGame} 
            onMove={handleMove} 
            disabled={!isAtLatestPosition}
          />

          <div className="mt-4 text-sm text-muted-foreground">
            {currentGame.isCheckmate() ? (
              <span className="text-destructive font-semibold">
                Мат! {currentGame.turn() === "w" ? "Черные" : "Белые"} победили
              </span>
            ) : currentGame.isDraw() ? (
              <span className="font-semibold">Пат!</span>
            ) : currentGame.isCheck() ? (
              <span className="text-orange-500">
                Шах! Ход {currentGame.turn() === "w" ? "белых" : "черных"}
              </span>
            ) : (
              <span>
                Ход {currentGame.turn() === "w" ? "белых" : "черных"}
                {!isAtLatestPosition && " (просмотр)"}
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pgn"
              className="hidden"
            />
            <Button onClick={handleButtonClick} size="lg" className="gap-2">
              <Upload className="w-4 h-4" />
              Загрузить PGN
            </Button>
            <Button
              onClick={handleReset}
              size="lg"
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Сброс
            </Button>
          </div>
        </div>

        <div className="w-80 flex-shrink-0">
          <PGNPanel 
            moves={allMoves} 
            currentMoveIndex={currentMoveIndex}
            onMoveSelect={handleMoveSelect}
            moveTree={moveTree}
            onVariationSelect={handleVariationSelect}
            currentFen={currentFen}
          />
        </div>
      </div>
    </main>
  )
}

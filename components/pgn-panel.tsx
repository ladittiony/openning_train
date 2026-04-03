"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"
import type { MoveNode } from "@/lib/chess"

interface PGNPanelProps {
  moves: string[]
  currentMoveIndex: number
  onMoveSelect: (index: number) => void
  moveTree?: MoveNode | null
  onVariationSelect?: (fen: string, path: string[]) => void
  currentFen?: string
}

export function PGNPanel({ 
  moves, 
  currentMoveIndex, 
  onMoveSelect,
  moveTree,
  onVariationSelect,
  currentFen
}: PGNPanelProps) {
  const goToStart = () => onMoveSelect(-1)
  const goToEnd = () => onMoveSelect(moves.length - 1)
  const goBack = () => onMoveSelect(Math.max(-1, currentMoveIndex - 1))
  const goForward = () => onMoveSelect(Math.min(moves.length - 1, currentMoveIndex + 1))

  // Render move tree with variations
  const renderMoveTree = (node: MoveNode, depth: number = 0, moveNum: number = 1, isBlack: boolean = false): React.ReactNode => {
    if (!node.san && node.children.length === 0) return null
    
    const elements: React.ReactNode[] = []
    
    // Render main line
    const renderMainLine = (children: MoveNode[], startNum: number, startIsBlack: boolean) => {
      const result: React.ReactNode[] = []
      let num = startNum
      let isBlackTurn = startIsBlack
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const isCurrentMove = currentFen === child.fen
        
        // Move number
        if (!isBlackTurn) {
          result.push(
            <span key={`num-${num}-${i}`} className="text-muted-foreground mr-1">
              {num}.
            </span>
          )
        } else if (i === 0 && depth > 0) {
          result.push(
            <span key={`num-${num}-${i}`} className="text-muted-foreground mr-1">
              {num}...
            </span>
          )
        }
        
        // Move button
        result.push(
          <button
            key={`move-${child.fen}-${i}`}
            onClick={() => onVariationSelect?.(child.fen, [])}
            className={`px-1 rounded transition-colors hover:bg-primary/20 ${
              isCurrentMove
                ? "bg-primary text-primary-foreground"
                : "text-foreground"
            }`}
          >
            {child.san}
          </button>
        )
        result.push(<span key={`space-${i}`}> </span>)
        
        // Render variations (siblings after first child)
        if (child.children.length > 1) {
          for (let j = 1; j < child.children.length; j++) {
            const variation = child.children[j]
            result.push(
              <span key={`var-${j}-${i}`} className="text-muted-foreground">
                (
                {renderVariation(variation, num + (isBlackTurn ? 1 : 0), !isBlackTurn)}
                ){" "}
              </span>
            )
          }
        }
        
        if (isBlackTurn) num++
        isBlackTurn = !isBlackTurn
        
        // Continue with first child (main line)
        if (child.children.length > 0) {
          result.push(...renderMainLine([child.children[0]], num, isBlackTurn))
          break
        }
      }
      
      return result
    }
    
    const renderVariation = (node: MoveNode, num: number, isBlack: boolean): React.ReactNode[] => {
      const result: React.ReactNode[] = []
      const isCurrentMove = currentFen === node.fen
      
      if (!isBlack) {
        result.push(
          <span key={`vnum-${num}`} className="text-muted-foreground mr-1">
            {num}.
          </span>
        )
      } else {
        result.push(
          <span key={`vnum-${num}`} className="text-muted-foreground mr-1">
            {num}...
          </span>
        )
      }
      
      result.push(
        <button
          key={`vmove-${node.fen}`}
          onClick={() => onVariationSelect?.(node.fen, [])}
          className={`px-1 rounded transition-colors hover:bg-primary/20 ${
            isCurrentMove
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70"
          }`}
        >
          {node.san}
        </button>
      )
      
      // Continue variation
      if (node.children.length > 0) {
        const nextNum = isBlack ? num + 1 : num
        result.push(<span key={`vspace`}> </span>)
        result.push(...renderVariation(node.children[0], nextNum, !isBlack))
      }
      
      return result
    }
    
    if (node.children.length > 0) {
      elements.push(...renderMainLine(node.children, moveNum, isBlack))
    }
    
    return elements
  }

  // Format moves into pairs for simple display (when no tree)
  const movePairs: { num: number; white: string; black?: string; whiteIndex: number; blackIndex?: number }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIndex: i,
      blackIndex: moves[i + 1] !== undefined ? i + 1 : undefined,
    })
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3 text-foreground">PGN</h2>
      
      {/* Navigation controls */}
      <div className="flex gap-1 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={goToStart}
          disabled={currentMoveIndex < 0}
          className="flex-1"
        >
          <ChevronFirst className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goBack}
          disabled={currentMoveIndex < 0}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goForward}
          disabled={currentMoveIndex >= moves.length - 1}
          className="flex-1"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToEnd}
          disabled={currentMoveIndex >= moves.length - 1}
          className="flex-1"
        >
          <ChevronLast className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 rounded-md border border-border bg-muted/30">
        <div className="p-4">
          {moveTree ? (
            <div className="text-sm font-mono leading-relaxed">
              {renderMoveTree(moveTree)}
            </div>
          ) : moves.length > 0 ? (
            <div className="space-y-1">
              {movePairs.map((pair) => (
                <div key={pair.num} className="flex gap-2 text-sm font-mono">
                  <span className="text-muted-foreground w-8">{pair.num}.</span>
                  <button
                    onClick={() => onMoveSelect(pair.whiteIndex)}
                    className={`w-16 text-left rounded px-1 transition-colors hover:bg-primary/20 ${
                      currentMoveIndex === pair.whiteIndex
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {pair.white}
                  </button>
                  {pair.black && pair.blackIndex !== undefined && (
                    <button
                      onClick={() => onMoveSelect(pair.blackIndex!)}
                      className={`w-16 text-left rounded px-1 transition-colors hover:bg-primary/20 ${
                        currentMoveIndex === pair.blackIndex
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {pair.black}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Сделайте ход или загрузите PGN файл
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Full PGN export */}
      {moves.length > 0 && !moveTree && (
        <div className="mt-3 p-3 rounded-md border border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Экспорт PGN
          </h3>
          <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all">
            {movePairs
              .map((p) => `${p.num}. ${p.white}${p.black ? ` ${p.black}` : ""}`)
              .join(" ")}
          </pre>
        </div>
      )}
    </div>
  )
}

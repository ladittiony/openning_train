export type PieceType = "p" | "n" | "b" | "r" | "q" | "k"
export type Color = "w" | "b"
export type Square =
  | "a1" | "a2" | "a3" | "a4" | "a5" | "a6" | "a7" | "a8"
  | "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7" | "b8"
  | "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7" | "c8"
  | "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "d7" | "d8"
  | "e1" | "e2" | "e3" | "e4" | "e5" | "e6" | "e7" | "e8"
  | "f1" | "f2" | "f3" | "f4" | "f5" | "f6" | "f7" | "f8"
  | "g1" | "g2" | "g3" | "g4" | "g5" | "g6" | "g7" | "g8"
  | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "h7" | "h8"

export interface Piece {
  type: PieceType
  color: Color
}

export interface Move {
  from: Square
  to: Square
  san: string
  piece: PieceType
  captured?: PieceType
  promotion?: PieceType
}

type BoardArray = (Piece | null)[][]

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

export class Chess {
  private _board: BoardArray
  private _turn: Color
  private _castling: { K: boolean; Q: boolean; k: boolean; q: boolean }
  private _enPassant: Square | null
  private _halfMoves: number
  private _fullMoves: number
  private _history: Move[]

  constructor(fen?: string) {
    this._board = this._createEmptyBoard()
    this._turn = "w"
    this._castling = { K: true, Q: true, k: true, q: true }
    this._enPassant = null
    this._halfMoves = 0
    this._fullMoves = 1
    this._history = []
    this._loadFen(fen || INITIAL_FEN)
  }

  private _createEmptyBoard(): BoardArray {
    return Array(8).fill(null).map(() => Array(8).fill(null))
  }

  private _loadFen(fen: string): void {
    const parts = fen.split(" ")
    const position = parts[0]
    
    this._board = this._createEmptyBoard()
    
    let row = 0
    let col = 0
    
    for (const char of position) {
      if (char === "/") {
        row++
        col = 0
      } else if (/\d/.test(char)) {
        col += parseInt(char)
      } else {
        const color: Color = char === char.toUpperCase() ? "w" : "b"
        const type = char.toLowerCase() as PieceType
        this._board[row][col] = { type, color }
        col++
      }
    }
    
    if (parts[1]) this._turn = parts[1] as Color
    if (parts[2]) {
      this._castling = {
        K: parts[2].includes("K"),
        Q: parts[2].includes("Q"),
        k: parts[2].includes("k"),
        q: parts[2].includes("q"),
      }
    }
    if (parts[3] && parts[3] !== "-") {
      this._enPassant = parts[3] as Square
    }
    if (parts[4]) this._halfMoves = parseInt(parts[4])
    if (parts[5]) this._fullMoves = parseInt(parts[5])
  }

  turn(): Color {
    return this._turn
  }

  board(): (Piece | null)[][] {
    return this._board.map(row => [...row])
  }

  history(): string[] {
    return this._history.map(m => m.san)
  }

  get(square: Square): Piece | null {
    const [col, row] = this._squareToCoords(square)
    return this._board[row][col]
  }

  private _squareToCoords(square: Square): [number, number] {
    const col = square.charCodeAt(0) - 97
    const row = 8 - parseInt(square[1])
    return [col, row]
  }

  private _coordsToSquare(col: number, row: number): Square {
    return `${FILES[col]}${RANKS[7 - row]}` as Square
  }

  moves(options?: { square?: Square; verbose?: boolean }): Move[] {
    const allMoves: Move[] = []
    
    if (options?.square) {
      const piece = this.get(options.square)
      if (piece && piece.color === this._turn) {
        return this._getMovesForSquare(options.square, piece)
      }
      return []
    }
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this._board[row][col]
        if (piece && piece.color === this._turn) {
          const square = this._coordsToSquare(col, row)
          allMoves.push(...this._getMovesForSquare(square, piece))
        }
      }
    }
    
    return allMoves
  }

  private _getMovesForSquare(square: Square, piece: Piece): Move[] {
    const moves: Move[] = []
    const [col, row] = this._squareToCoords(square)
    
    const addMove = (toCol: number, toRow: number, promotion?: PieceType) => {
      if (toCol < 0 || toCol > 7 || toRow < 0 || toRow > 7) return false
      
      const target = this._board[toRow][toCol]
      if (target && target.color === piece.color) return false
      
      const toSquare = this._coordsToSquare(toCol, toRow)
      const move: Move = {
        from: square,
        to: toSquare,
        san: this._generateSan(square, toSquare, piece, target, promotion),
        piece: piece.type,
        captured: target?.type,
        promotion,
      }
      
      // Check if move leaves king in check
      if (!this._wouldBeInCheck(square, toSquare, promotion)) {
        moves.push(move)
      }
      
      return !target // Return true if square was empty (for sliding pieces)
    }
    
    switch (piece.type) {
      case "p": {
        const direction = piece.color === "w" ? -1 : 1
        const startRow = piece.color === "w" ? 6 : 1
        const promoRow = piece.color === "w" ? 0 : 7
        
        // Forward move
        if (!this._board[row + direction]?.[col]) {
          if (row + direction === promoRow) {
            for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
              addMove(col, row + direction, promo)
            }
          } else {
            addMove(col, row + direction)
          }
          
          // Double move from start
          if (row === startRow && !this._board[row + 2 * direction]?.[col]) {
            addMove(col, row + 2 * direction)
          }
        }
        
        // Captures
        for (const dc of [-1, 1]) {
          const targetCol = col + dc
          const targetRow = row + direction
          if (targetCol >= 0 && targetCol <= 7 && targetRow >= 0 && targetRow <= 7) {
            const target = this._board[targetRow][targetCol]
            const enPassantSquare = this._enPassant ? this._squareToCoords(this._enPassant) : null
            
            if (target && target.color !== piece.color) {
              if (targetRow === promoRow) {
                for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
                  addMove(targetCol, targetRow, promo)
                }
              } else {
                addMove(targetCol, targetRow)
              }
            } else if (enPassantSquare && targetCol === enPassantSquare[0] && targetRow === enPassantSquare[1]) {
              // En passant
              const move: Move = {
                from: square,
                to: this._coordsToSquare(targetCol, targetRow),
                san: `${FILES[col]}x${this._coordsToSquare(targetCol, targetRow)}`,
                piece: "p",
                captured: "p",
              }
              if (!this._wouldBeInCheck(square, move.to)) {
                moves.push(move)
              }
            }
          }
        }
        break
      }
      
      case "n": {
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ]
        for (const [dc, dr] of knightMoves) {
          addMove(col + dc, row + dr)
        }
        break
      }
      
      case "b": {
        for (const [dc, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(col + dc * i, row + dr * i)) break
          }
        }
        break
      }
      
      case "r": {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(col + dc * i, row + dr * i)) break
          }
        }
        break
      }
      
      case "q": {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(col + dc * i, row + dr * i)) break
          }
        }
        break
      }
      
      case "k": {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          addMove(col + dc, row + dr)
        }
        
        // Castling
        if (!this._isInCheck()) {
          if (piece.color === "w") {
            if (this._castling.K && !this._board[7][5] && !this._board[7][6]) {
              if (!this._wouldBeInCheck("e1", "f1") && !this._wouldBeInCheck("e1", "g1")) {
                moves.push({ from: "e1", to: "g1", san: "O-O", piece: "k" })
              }
            }
            if (this._castling.Q && !this._board[7][1] && !this._board[7][2] && !this._board[7][3]) {
              if (!this._wouldBeInCheck("e1", "d1") && !this._wouldBeInCheck("e1", "c1")) {
                moves.push({ from: "e1", to: "c1", san: "O-O-O", piece: "k" })
              }
            }
          } else {
            if (this._castling.k && !this._board[0][5] && !this._board[0][6]) {
              if (!this._wouldBeInCheck("e8", "f8") && !this._wouldBeInCheck("e8", "g8")) {
                moves.push({ from: "e8", to: "g8", san: "O-O", piece: "k" })
              }
            }
            if (this._castling.q && !this._board[0][1] && !this._board[0][2] && !this._board[0][3]) {
              if (!this._wouldBeInCheck("e8", "d8") && !this._wouldBeInCheck("e8", "c8")) {
                moves.push({ from: "e8", to: "c8", san: "O-O-O", piece: "k" })
              }
            }
          }
        }
        break
      }
    }
    
    return moves
  }

  private _generateSan(from: Square, to: Square, piece: Piece, captured: Piece | null, promotion?: PieceType): string {
    let san = ""
    
    if (piece.type !== "p") {
      san += piece.type.toUpperCase()
    }
    
    if (captured) {
      if (piece.type === "p") {
        san += from[0]
      }
      san += "x"
    }
    
    san += to
    
    if (promotion) {
      san += "=" + promotion.toUpperCase()
    }
    
    return san
  }

  private _findKing(color: Color): Square | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this._board[row][col]
        if (piece && piece.type === "k" && piece.color === color) {
          return this._coordsToSquare(col, row)
        }
      }
    }
    return null
  }

  private _isSquareAttacked(square: Square, byColor: Color): boolean {
    const [targetCol, targetRow] = this._squareToCoords(square)
    
    // Check pawn attacks
    const pawnDir = byColor === "w" ? 1 : -1
    for (const dc of [-1, 1]) {
      const attackRow = targetRow + pawnDir
      const attackCol = targetCol + dc
      if (attackRow >= 0 && attackRow <= 7 && attackCol >= 0 && attackCol <= 7) {
        const piece = this._board[attackRow][attackCol]
        if (piece && piece.type === "p" && piece.color === byColor) {
          return true
        }
      }
    }
    
    // Check knight attacks
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    for (const [dc, dr] of knightMoves) {
      const checkCol = targetCol + dc
      const checkRow = targetRow + dr
      if (checkCol >= 0 && checkCol <= 7 && checkRow >= 0 && checkRow <= 7) {
        const piece = this._board[checkRow][checkCol]
        if (piece && piece.type === "n" && piece.color === byColor) {
          return true
        }
      }
    }
    
    // Check king attacks
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const checkCol = targetCol + dc
      const checkRow = targetRow + dr
      if (checkCol >= 0 && checkCol <= 7 && checkRow >= 0 && checkRow <= 7) {
        const piece = this._board[checkRow][checkCol]
        if (piece && piece.type === "k" && piece.color === byColor) {
          return true
        }
      }
    }
    
    // Check sliding pieces (rook, queen - straight lines)
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let i = 1; i < 8; i++) {
        const checkCol = targetCol + dc * i
        const checkRow = targetRow + dr * i
        if (checkCol < 0 || checkCol > 7 || checkRow < 0 || checkRow > 7) break
        
        const piece = this._board[checkRow][checkCol]
        if (piece) {
          if (piece.color === byColor && (piece.type === "r" || piece.type === "q")) {
            return true
          }
          break
        }
      }
    }
    
    // Check sliding pieces (bishop, queen - diagonals)
    for (const [dc, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let i = 1; i < 8; i++) {
        const checkCol = targetCol + dc * i
        const checkRow = targetRow + dr * i
        if (checkCol < 0 || checkCol > 7 || checkRow < 0 || checkRow > 7) break
        
        const piece = this._board[checkRow][checkCol]
        if (piece) {
          if (piece.color === byColor && (piece.type === "b" || piece.type === "q")) {
            return true
          }
          break
        }
      }
    }
    
    return false
  }

  private _isInCheck(): boolean {
    const kingSquare = this._findKing(this._turn)
    if (!kingSquare) return false
    return this._isSquareAttacked(kingSquare, this._turn === "w" ? "b" : "w")
  }

  private _wouldBeInCheck(from: Square, to: Square, promotion?: PieceType): boolean {
    const [fromCol, fromRow] = this._squareToCoords(from)
    const [toCol, toRow] = this._squareToCoords(to)
    
    // Save state
    const fromPiece = this._board[fromRow][fromCol]
    const toPiece = this._board[toRow][toCol]
    
    if (!fromPiece) return true
    
    // Make move
    this._board[toRow][toCol] = promotion 
      ? { type: promotion, color: fromPiece.color }
      : fromPiece
    this._board[fromRow][fromCol] = null
    
    // Handle en passant capture
    let enPassantCapture: Piece | null = null
    if (fromPiece.type === "p" && this._enPassant === to) {
      const captureRow = fromPiece.color === "w" ? toRow + 1 : toRow - 1
      enPassantCapture = this._board[captureRow][toCol]
      this._board[captureRow][toCol] = null
    }
    
    // Check if king is in check
    const kingSquare = this._findKing(this._turn)
    const inCheck = kingSquare ? this._isSquareAttacked(kingSquare, this._turn === "w" ? "b" : "w") : true
    
    // Restore state
    this._board[fromRow][fromCol] = fromPiece
    this._board[toRow][toCol] = toPiece
    
    if (enPassantCapture) {
      const captureRow = fromPiece.color === "w" ? toRow + 1 : toRow - 1
      this._board[captureRow][toCol] = enPassantCapture
    }
    
    return inCheck
  }

  isCheck(): boolean {
    return this._isInCheck()
  }

  isCheckmate(): boolean {
    if (!this._isInCheck()) return false
    return this.moves().length === 0
  }

  isDraw(): boolean {
    if (this._isInCheck()) return false
    return this.moves().length === 0 // Stalemate
  }

  isGameOver(): boolean {
    return this.isCheckmate() || this.isDraw()
  }

  move(options: { from: Square; to: Square; promotion?: PieceType }): Move | null {
    const { from, to, promotion } = options
    const legalMoves = this.moves({ square: from })
    
    const move = legalMoves.find(m => {
      if (m.to !== to) return false
      if (promotion && m.promotion !== promotion) return false
      if (!promotion && m.promotion) return false
      return true
    })
    
    if (!move) return null
    
    const [fromCol, fromRow] = this._squareToCoords(from)
    const [toCol, toRow] = this._squareToCoords(to)
    const piece = this._board[fromRow][fromCol]!
    
    // Handle castling
    if (piece.type === "k") {
      if (to === "g1" && from === "e1") {
        this._board[7][5] = this._board[7][7]
        this._board[7][7] = null
      } else if (to === "c1" && from === "e1") {
        this._board[7][3] = this._board[7][0]
        this._board[7][0] = null
      } else if (to === "g8" && from === "e8") {
        this._board[0][5] = this._board[0][7]
        this._board[0][7] = null
      } else if (to === "c8" && from === "e8") {
        this._board[0][3] = this._board[0][0]
        this._board[0][0] = null
      }
    }
    
    // Handle en passant capture
    if (piece.type === "p" && this._enPassant === to) {
      const captureRow = piece.color === "w" ? toRow + 1 : toRow - 1
      this._board[captureRow][toCol] = null
    }
    
    // Set en passant square
    if (piece.type === "p" && Math.abs(toRow - fromRow) === 2) {
      this._enPassant = this._coordsToSquare(toCol, (fromRow + toRow) / 2)
    } else {
      this._enPassant = null
    }
    
    // Make move
    this._board[toRow][toCol] = promotion 
      ? { type: promotion, color: piece.color }
      : piece
    this._board[fromRow][fromCol] = null
    
    // Update castling rights
    if (piece.type === "k") {
      if (piece.color === "w") {
        this._castling.K = false
        this._castling.Q = false
      } else {
        this._castling.k = false
        this._castling.q = false
      }
    }
    if (piece.type === "r") {
      if (from === "a1") this._castling.Q = false
      if (from === "h1") this._castling.K = false
      if (from === "a8") this._castling.q = false
      if (from === "h8") this._castling.k = false
    }
    
    // Update turn
    this._turn = this._turn === "w" ? "b" : "w"
    
    // Update move numbers
    if (this._turn === "w") this._fullMoves++
    
    // Add check/checkmate symbols
    let san = move.san
    if (this.isCheckmate()) {
      san += "#"
    } else if (this.isCheck()) {
      san += "+"
    }
    
    const finalMove = { ...move, san }
    this._history.push(finalMove)
    
    return finalMove
  }

  loadPgn(pgn: string): boolean {
    // PGN parser - handles headers, comments, variations, and move text
    let text = pgn
    
    // Remove headers [Tag "Value"] - handle multiline
    text = text.replace(/\[\s*\w+\s+"[^"]*"\s*\]/g, "")
    
    // Remove comments in braces {comment}
    text = text.replace(/\{[^}]*\}/g, "")
    
    // Remove comments starting with ;
    text = text.replace(/;[^\n]*/g, "")
    
    // Remove recursive variations (parentheses) - simple approach
    let prevText = ""
    while (prevText !== text) {
      prevText = text
      text = text.replace(/\([^()]*\)/g, "")
    }
    
    // Remove NAGs (Numeric Annotation Glyphs) like $1, $2, etc.
    text = text.replace(/\$\d+/g, "")
    
    // Remove move numbers like "1." or "1..." 
    text = text.replace(/\d+\.{1,3}/g, "")
    
    // Remove results
    text = text.replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
    
    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim()
    
    const moves = text.split(/\s+/).filter(m => m.length > 0 && /^[a-hKQRBNO0-9]/.test(m))
    
    // Reset board
    this._loadFen(INITIAL_FEN)
    this._history = []
    
    for (const sanMove of moves) {
      if (!this._makeSanMove(sanMove)) {
        return false
      }
    }
    
    return true
  }

  private _makeSanMove(san: string): boolean {
    const legalMoves = this.moves()
    
    // Handle castling (various notations)
    const castlingKingside = /^[oO0]-?[oO0]$/
    const castlingQueenside = /^[oO0]-?[oO0]-?[oO0]$/
    
    if (castlingQueenside.test(san.replace(/[+#!?]/g, ""))) {
      const move = legalMoves.find(m => m.san === "O-O-O")
      if (move) {
        this.move({ from: move.from, to: move.to })
        return true
      }
      return false
    }
    if (castlingKingside.test(san.replace(/[+#!?]/g, ""))) {
      const move = legalMoves.find(m => m.san === "O-O")
      if (move) {
        this.move({ from: move.from, to: move.to })
        return true
      }
      return false
    }
    
    // Parse SAN - remove annotations
    let cleanSan = san.replace(/[+#!?]+$/g, "")
    let promotion: PieceType | undefined
    
    // Handle promotion
    const promoMatch = cleanSan.match(/=?([QRBN])$/i)
    if (promoMatch) {
      promotion = promoMatch[1].toLowerCase() as PieceType
      cleanSan = cleanSan.replace(/=?[QRBN]$/i, "")
    }
    
    // Flexible regex for SAN: piece, disambiguation, capture, target
    const match = cleanSan.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])$/)
    if (!match) return false
    
    const [, pieceChar, fileHint, rankHint, , targetSquare] = match
    const pieceType = (pieceChar?.toLowerCase() || "p") as PieceType
    
    const candidates = legalMoves.filter(m => {
      if (m.to !== targetSquare) return false
      if (m.piece !== pieceType) return false
      if (promotion) {
        if (!m.promotion) return false
        if (m.promotion !== promotion) return false
      } else {
        // If no promotion specified, prefer non-promotion moves or accept queen promo
        if (m.promotion && m.promotion !== "q") return false
      }
      if (fileHint && m.from[0] !== fileHint) return false
      if (rankHint && m.from[1] !== rankHint) return false
      return true
    })
    
    if (candidates.length >= 1) {
      // If multiple candidates (e.g., promotions), prefer queen or first
      const move = candidates.find(m => m.promotion === "q") || candidates[0]
      this.move({ from: move.from, to: move.to as Square, promotion: move.promotion })
      return true
    }
    
    return false
  }

  fen(): string {
    let fen = ""
    
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0
      for (let col = 0; col < 8; col++) {
        const piece = this._board[row][col]
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount
            emptyCount = 0
          }
          fen += piece.color === "w" ? piece.type.toUpperCase() : piece.type
        } else {
          emptyCount++
        }
      }
      if (emptyCount > 0) fen += emptyCount
      if (row < 7) fen += "/"
    }
    
    fen += ` ${this._turn}`
    
    let castling = ""
    if (this._castling.K) castling += "K"
    if (this._castling.Q) castling += "Q"
    if (this._castling.k) castling += "k"
    if (this._castling.q) castling += "q"
    fen += ` ${castling || "-"}`
    
    fen += ` ${this._enPassant || "-"}`
    fen += ` ${this._halfMoves}`
    fen += ` ${this._fullMoves}`
    
    return fen
  }

  loadFen(fen: string): void {
    this._loadFen(fen)
    this._history = []
  }

  // Parse PGN with variations into a tree structure
  static parsePgnWithVariations(pgn: string): MoveNode | null {
    // Remove headers
    let text = pgn.replace(/\[\s*\w+\s+"[^"]*"\s*\]/g, "")
    text = text.replace(/\{[^}]*\}/g, " ") // Remove comments
    text = text.replace(/;[^\n]*/g, "") // Remove line comments
    text = text.replace(/\$\d+/g, "") // Remove NAGs
    
    // Tokenize
    const tokens: string[] = []
    let current = ""
    let i = 0
    
    while (i < text.length) {
      const char = text[i]
      
      if (char === "(" || char === ")") {
        if (current.trim()) tokens.push(current.trim())
        current = ""
        tokens.push(char)
        i++
      } else if (/\s/.test(char)) {
        if (current.trim()) tokens.push(current.trim())
        current = ""
        i++
      } else {
        current += char
        i++
      }
    }
    if (current.trim()) tokens.push(current.trim())
    
    // Filter tokens
    const filteredTokens = tokens.filter(t => {
      if (t === "(" || t === ")") return true
      if (/^\d+\.+$/.test(t)) return false // Move numbers
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) return false // Results
      return t.length > 0
    })
    
    const root: MoveNode = {
      san: "",
      fen: INITIAL_FEN,
      children: [],
    }
    
    const parseVariation = (
      tokens: string[],
      idx: { i: number },
      parentFen: string
    ): MoveNode[] => {
      const nodes: MoveNode[] = []
      const game = new Chess(parentFen)
      
      while (idx.i < tokens.length) {
        const token = tokens[idx.i]
        
        if (token === "(") {
          idx.i++
          // Variation starts from parent's position (before last move)
          if (nodes.length > 0) {
            const lastNode = nodes[nodes.length - 1]
            // Find parent position (position before lastNode was made)
            let parentPos = parentFen
            if (nodes.length > 1) {
              parentPos = nodes[nodes.length - 2].fen
            }
            const variationNodes = parseVariation(tokens, idx, parentPos)
            if (variationNodes.length > 0) {
              // Add as sibling variation
              lastNode.children.push(...variationNodes)
            }
          }
          continue
        }
        
        if (token === ")") {
          idx.i++
          return nodes
        }
        
        // Try to make the move
        const san = token.replace(/[!?]+$/, "")
        const success = game._makeSanMove(san)
        
        if (success) {
          const history = game.history()
          const node: MoveNode = {
            san: history[history.length - 1] || san,
            fen: game.fen(),
            children: [],
          }
          nodes.push(node)
        }
        
        idx.i++
      }
      
      return nodes
    }
    
    const idx = { i: 0 }
    const mainLine = parseVariation(filteredTokens, idx, INITIAL_FEN)
    
    if (mainLine.length === 0) return null
    
    root.children = mainLine
    return root
  }
}

export interface MoveNode {
  san: string
  fen: string
  children: MoveNode[]
  comment?: string
}

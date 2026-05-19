import { useState, useEffect, useMemo, useCallback } from 'react'
import SimpleGoban from './SimpleGoban'
import Board from '@sabaki/go-board'
import * as sgf from '@sabaki/sgf'

type Move = { sign: 1 | -1; vertex: [number, number] }

const DEFAULT_MOVE_STEP = 25
const MOVE_STEP = Number(localStorage.getItem('moveStep')) || DEFAULT_MOVE_STEP

interface SgfNode {
  id: number
  data: Record<string, string[]>
  parentId: number | null
  children: SgfNode[]
}

function extractMoves(rootNode: SgfNode): Move[] {
  const moves: Move[] = []
  let node = rootNode

  while (node.children.length > 0) {
    node = node.children[0]
    if (node.data.B) {
      const vertex = sgf.parseVertex(node.data.B[0]) as [number, number]
      if (vertex[0] >= 0 && vertex[1] >= 0) {
        moves.push({ sign: 1, vertex })
      }
    } else if (node.data.W) {
      const vertex = sgf.parseVertex(node.data.W[0]) as [number, number]
      if (vertex[0] >= 0 && vertex[1] >= 0) {
        moves.push({ sign: -1, vertex })
      }
    }
  }

  return moves
}

function replayUpTo(moves: Move[], n: number): Board {
  let board = Board.fromDimensions(19)
  for (let i = 0; i < n; i++) {
    board = board.makeMove(moves[i].sign, moves[i].vertex)
  }
  return board
}

function encodeHash(text: string): string {
  return encodeURIComponent(btoa(text))
}

function decodeHash(hash: string): string {
  return atob(decodeURIComponent(hash))
}

function getInitialSgfText(): string | null {
  const hash = location.hash.slice(1)
  if (hash) {
    return decodeHash(hash)
  }
  const stored = localStorage.getItem('sgf')
  if (stored) {
    location.hash = encodeHash(stored)
    return stored
  }
  return null
}

function App() {
  const [sgfText, setSgfText] = useState<string | null>(getInitialSgfText)
  const [moveIndex, setMoveIndex] = useState(0)

  const loadFile = (file: File) => {
    file.text().then((text) => {
      localStorage.setItem('sgf', text)
      location.hash = encodeHash(text)
      setSgfText(text)
      setMoveIndex(0)
    })
  }

  const handleClearFile = () => {
    localStorage.removeItem('sgf')
    location.hash = ''
    location.reload()
  }

  const handleDownloadSgf = () => {
    const blob = new Blob([sgfText!], { type: 'application/x-go-sgf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'game.sgf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleMovesPerPage = () => {
    const input = prompt(`Moves per page (default: ${DEFAULT_MOVE_STEP}):`)
    if (input == null || input === '') return
    const n = Number(input)
    if (isNaN(n) || n <= 0) return
    localStorage.setItem('moveStep', String(n))
    location.reload()
  }

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault()
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) loadFile(file)
    }
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const { moves, playerBlack, playerWhite } = useMemo(() => {
    if (!sgfText) return { moves: [] as Move[], playerBlack: 'Unknown', playerWhite: 'Unknown' }
    const rootNodes = sgf.parse(sgfText) as SgfNode[]
    const root = rootNodes[0]
    const moves = extractMoves(root)
    const playerBlack = root.data.PB?.[0] || 'Unknown'
    const playerWhite = root.data.PW?.[0] || 'Unknown'
    return { moves, playerBlack, playerWhite }
  }, [sgfText])

  const maxMoveIndex = moves.length > 0 ? Math.floor((moves.length - 1) / MOVE_STEP) * MOVE_STEP : 0
  const displayMoveIndex = Math.round(moveIndex)
  const pageEnd = Math.min(Math.round(moveIndex + MOVE_STEP), moves.length)

  const { displaySignMap, moveNumbers, footerMoves } = useMemo(() => {
    const baseBoard = replayUpTo(moves, displayMoveIndex)
    const displaySignMap = baseBoard.signMap.map(row => [...row]) as (0 | 1 | -1)[][]
    const grid: (number | null)[][] = Array.from({ length: 19 }, () => Array(19).fill(null))
    // Moves that can't be shown on the board (stone already present), listed in the footer instead
    const footerMoves: { text: string; vertex: [number, number] }[] = []
    for (let i = displayMoveIndex; i < pageEnd; i++) {
      const [x, y] = moves[i].vertex
      const label = i + 1
      if (grid[y][x] !== null) {
        footerMoves.push({ text: `${label} at ${grid[y][x]}`, vertex: [x, y] })
      } else if (baseBoard.signMap[y][x] !== 0) {
        footerMoves.push({ text: `${label} at ${x + 1}-${y + 1}`, vertex: [x, y] })
      } else {
        displaySignMap[y][x] = moves[i].sign
        grid[y][x] = label
      }
    }
    return { displaySignMap, moveNumbers: grid, footerMoves }
  }, [moves, displayMoveIndex, pageEnd])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g') {
        const input = prompt('Go to move number:')
        if (input == null) return
        const n = Number(input)
        if (isNaN(n)) return
        setMoveIndex(Math.max(0, Math.min(maxMoveIndex, Math.floor(n / MOVE_STEP) * MOVE_STEP)))
        return
      }

      if (e.key === ' ' && !e.altKey) {
        e.preventDefault()
        setMoveIndex((i) => Math.min(maxMoveIndex, i + MOVE_STEP))
        return
      }

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      if (e.altKey) {
        setMoveIndex(e.key === 'ArrowLeft' ? 0 : maxMoveIndex)
      } else if (e.key === 'ArrowRight') {
        setMoveIndex((i) => Math.min(maxMoveIndex, i + MOVE_STEP))
      } else {
        setMoveIndex((i) => Math.max(0, i - MOVE_STEP))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [maxMoveIndex])

  const [hoveredRepeatVertex, setHoveredRepeatVertex] = useState<[number, number] | null>(null)

  const handleRepeatEnter = useCallback((vertex: [number, number]) => setHoveredRepeatVertex(vertex), [])
  const handleRepeatLeave = useCallback(() => setHoveredRepeatVertex(null), [])

  const symbols = useMemo((): ('t' | 's' | null)[][] | undefined => {
    if (!hoveredRepeatVertex) return undefined
    const [x, y] = hoveredRepeatVertex
    const grid: ('t' | 's' | null)[][] = Array.from({ length: 19 }, () => Array(19).fill(null))
    grid[y][x] = 't'
    return grid
  }, [hoveredRepeatVertex])

  const cellSize = 50

  if (!sgfText) return (
    <div>
      <input type="file" accept=".sgf" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
      <p>Or drag and drop an SGF file anywhere</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleClearFile} style={{ marginRight: '10px' }}>-</button>
        {playerBlack} (B) vs {playerWhite} (W)
        <button onClick={handleDownloadSgf} style={{ marginLeft: '50px' }}>Download SGF</button>
        <button onClick={handleMovesPerPage} style={{ marginLeft: '50px' }}>{MOVE_STEP} moves per page ({displayMoveIndex + 1} to {pageEnd})</button>
      </div>
      <SimpleGoban
        signMap={displaySignMap}
        cellSize={cellSize}
        moveNumbers={moveNumbers}
        symbols={symbols}
      />
      <div style={{ marginTop: 10 }}>
        {footerMoves.length > 0
          ? footerMoves.map((r, i) => (
              <span
                key={i}
                onMouseEnter={() => handleRepeatEnter(r.vertex)}
                onMouseLeave={handleRepeatLeave}
                style={{ fontSize: '1.3rem' }}
              >
                {i > 0 ? ' \u2014 ' : ''}{r.text}
              </span>
            ))
          : <span style={{ fontSize: '1.3rem' }}>{'\u00a0'}</span>}
      </div>
    </div>
  )
}

export default App

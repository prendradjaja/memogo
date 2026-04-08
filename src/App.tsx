import { useState, useEffect, useMemo } from 'react'
import SimpleGoban from './SimpleGoban'
import Board from '@sabaki/go-board'
import * as sgf from '@sabaki/sgf'

type Move = { sign: 1 | -1; vertex: [number, number] }

const MOVE_STEP = 50

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

function App() {
  const [sgfText, setSgfText] = useState<string | null>(() => localStorage.getItem('sgf'))
  const [moveIndex, setMoveIndex] = useState(0)

  const loadFile = (file: File) => {
    file.text().then((text) => {
      localStorage.setItem('sgf', text)
      setSgfText(text)
      setMoveIndex(0)
    })
  }

  const handleClearFile = () => {
    localStorage.removeItem('sgf')
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
  const pageEnd = Math.min(moveIndex + MOVE_STEP, moves.length)

  const { displaySignMap, annotations, repeats } = useMemo(() => {
    const baseBoard = replayUpTo(moves, moveIndex)
    const displaySignMap = baseBoard.signMap.map(row => [...row]) as (0 | 1 | -1)[][]
    const grid: (string | null)[][] = Array.from({ length: 19 }, () => Array(19).fill(null))
    const repeats: string[] = []
    for (let i = moveIndex; i < pageEnd; i++) {
      const [x, y] = moves[i].vertex
      const label = String(i + 1)
      if (grid[y][x] !== null) {
        repeats.push(`${label} at ${grid[y][x]}`)
      } else {
        displaySignMap[y][x] = moves[i].sign
        grid[y][x] = label
      }
    }
    return { displaySignMap, annotations: grid, repeats }
  }, [moves, moveIndex, pageEnd])

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

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      if (e.altKey) {
        setMoveIndex(e.key === 'ArrowLeft' ? 0 : maxMoveIndex)
      } else if (e.key === 'ArrowRight') {
        setMoveIndex((i) => Math.min(maxMoveIndex, (Math.floor(i / MOVE_STEP) + 1) * MOVE_STEP))
      } else {
        setMoveIndex((i) => Math.max(0, (Math.ceil(i / MOVE_STEP) - 1) * MOVE_STEP))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [maxMoveIndex])

  const cellSize = 50

  if (!sgfText) return (
    <div>
      <input type="file" accept=".sgf" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
      <p>Or drag and drop an SGF file anywhere</p>
    </div>
  )

  return (
    <>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleClearFile}>Clear File</button>
        {' '}
        {playerBlack} (B) vs {playerWhite} (W)
      </div>
      <SimpleGoban
        signMap={displaySignMap}
        cellSize={cellSize}
        annotations={annotations}
      />
      {repeats.length > 0 && (
        <div>{repeats.join(', ')}</div>
      )}
    </>
  )
}

export default App

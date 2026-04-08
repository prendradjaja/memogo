import { useState, useEffect, useMemo } from 'react'
import SimpleGoban from './SimpleGoban'
import Board from '@sabaki/go-board'
import * as sgf from '@sabaki/sgf'

type Move = { sign: 1 | -1; vertex: [number, number] }

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

// https://stackoverflow.com/a/7228322
function randomIntFromInterval(min: number, max: number) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}


function App() {
  const [sgfText, setSgfText] = useState<string | null>(() => localStorage.getItem('sgf'))
  const [moveIndex, setMoveIndex] = useState(0)
  const [fork, setFork] = useState<Move[] | null>(null)
  const [forkIndex, setForkIndex] = useState(0)
  const [checkReport, setCheckReport] = useState<{ forkStart: number; divergence: number | null; forkEnd: number } | null>(null)

  const mode: 'viewing' | 'recalling' = fork ? 'recalling' : 'viewing'

  const loadFile = (file: File) => {
    file.text().then((text) => {
      localStorage.setItem('sgf', text)
      setSgfText(text)
      setMoveIndex(0)
      setFork(null)
      setForkIndex(0)
      setCheckReport(null)
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

  const currentBoard = useMemo(() => {
    if (mode === 'recalling') return replayUpTo(fork!, forkIndex)
    return replayUpTo(moves, moveIndex)
  }, [mode, fork, forkIndex, moves, moveIndex])

  // Determine next player
  const nextSign = (movelist: Move[]): 1 | -1 => {
    if (movelist.length === 0) return 1
    return movelist[movelist.length - 1].sign === 1 ? -1 : 1
  }
  const displaySign = mode === 'recalling'
    ? nextSign(fork!.slice(0, forkIndex))
    : nextSign(moves.slice(0, moveIndex))

  const handleVertexClick = (x: number, y: number) => {
    if (currentBoard.get([x, y]) !== 0) return
    setCheckReport(null)
    const newMove: Move = { sign: displaySign, vertex: [x, y] }
    if (mode === 'recalling') {
      const newFork = [...fork!.slice(0, forkIndex), newMove]
      setFork(newFork)
      setForkIndex(newFork.length)
    } else {
      const newFork = [...moves.slice(0, moveIndex), newMove]
      setFork(newFork)
      setForkIndex(newFork.length)
    }
  }

  const handleCheck = () => {
    if (!fork) return
    // Find where fork starts (first move index that's part of the fork, i.e. 0)
    // Fork start is the number of shared prefix moves with the original
    // Actually fork always starts from move 0, but the interesting number is
    // where the user branched off from viewing
    const forkStart = 1 // move 1 (first move in fork)
    let divergence: number | null = null
    for (let i = 0; i < fork.length; i++) {
      if (!moves[i] || fork[i].vertex[0] !== moves[i].vertex[0] || fork[i].vertex[1] !== moves[i].vertex[1] || fork[i].sign !== moves[i].sign) {
        divergence = i + 1
        break
      }
    }
    setCheckReport({ forkStart, divergence, forkEnd: fork.length })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g') {
        const input = prompt('Go to move number:')
        if (input == null) return
        const n = Number(input)
        if (isNaN(n)) return
        if (mode === 'recalling') {
          setForkIndex(Math.max(0, Math.min(fork!.length, n)))
        } else {
          setMoveIndex(Math.max(0, Math.min(moves.length, n)))
        }
        return
      } else if (e.key === 'r') {
        if (mode === 'recalling') {
          return
        }
        const n = randomIntFromInterval(0, moves.length)
        setMoveIndex(n)
        return
      } else if (e.key === 'c') {
        handleCheck()
        return
      }

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const delta = (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1)

      if (mode === 'recalling') {
        if (e.altKey) {
          setForkIndex(e.key === 'ArrowLeft' ? 0 : fork!.length)
        } else {
          setForkIndex((i) => Math.max(0, Math.min(fork!.length, i + delta)))
        }
      } else {
        if (e.altKey) {
          setMoveIndex(e.key === 'ArrowLeft' ? 0 : moves.length)
        } else {
          setMoveIndex((i) => Math.max(0, Math.min(moves.length, i + delta)))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, fork, moves.length])

  const cellSize = 50
  const boardCols = currentBoard.signMap[0].length
  const boardWidth = (boardCols - 1) * cellSize + cellSize

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
        <span style={{ marginLeft: 80 }}></span>
        <button onClick={handleCheck} disabled={mode === 'viewing'}>Check</button>
        {checkReport && (
          <span style={{ fontFamily: 'monospace' }}>
            {' '}
            {checkReport.divergence == null ? (
              <span style={{ color: 'green', fontWeight: 'bold' }}>On track</span>
            ) : (
              <>
                {/*
                <span>
                  <a href="#" onClick={(e) => { e.preventDefault(); setForkIndex(checkReport.forkStart) }} style={{ color: 'inherit' }}>
                    {checkReport.forkStart}
                  </a> Fork starts
                </span>
                */}
                <span style={{ color: 'red' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setForkIndex(checkReport.divergence!) }} style={{ color: 'red' }}>
                    Diverged
                  </a>
                </span>
                {' '}
                <span>
                  <a href="#" onClick={(e) => { e.preventDefault(); setForkIndex(checkReport.forkEnd) }} style={{ color: 'inherit' }}>
                    End of fork
                  </a>
                </span>
              </>
            )}
          </span>
        )}
      </div>
      <SimpleGoban
        signMap={currentBoard.signMap}
        cellSize={cellSize}
        ghostSign={displaySign}
        onVertexClick={handleVertexClick}
      />
      <div>
        {mode === 'viewing' ? (
          <input
            type="range"
            min={0}
            max={moves.length}
            value={moveIndex}
            onChange={(e) => setMoveIndex(Number(e.target.value))}
            style={{ width: `${boardWidth}px` }}
          />
        ) : (
          <input
            type="range"
            min={0}
            max={moves.length}
            value={Math.min(forkIndex, moves.length)}
            onChange={(e) => setForkIndex(Math.min(Number(e.target.value), fork!.length))}
            style={{ width: `${boardWidth}px` }}
          />
        )}
      </div>
      <div>
      </div>
    </>
  )
}

export default App

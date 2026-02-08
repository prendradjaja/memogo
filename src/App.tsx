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

function replayMoves(moves: Move[]): Board[] {
  const boards = [Board.fromDimensions(19)]
  for (const move of moves) {
    boards.push(boards[boards.length - 1].makeMove(move.sign, move.vertex))
  }
  return boards
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

  const { boards, moves, playerBlack, playerWhite } = useMemo(() => {
    if (!sgfText) return { boards: [Board.fromDimensions(19)], moves: [] as Move[], playerBlack: 'Unknown', playerWhite: 'Unknown' }
    const rootNodes = sgf.parse(sgfText) as SgfNode[]
    const root = rootNodes[0]
    const moves = extractMoves(root)
    const playerBlack = root.data.PB?.[0] || 'Unknown'
    const playerWhite = root.data.PW?.[0] || 'Unknown'
    return { boards: replayMoves(moves), moves, playerBlack, playerWhite }
  }, [sgfText])

  const forkBoards = useMemo(() => {
    if (!fork) return null
    return replayMoves(fork)
  }, [fork])

  const currentBoard = mode === 'recalling'
    ? forkBoards![forkIndex]
    : boards[moveIndex]

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
          setMoveIndex(Math.max(0, Math.min(boards.length - 1, n)))
        }
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
          setMoveIndex(e.key === 'ArrowLeft' ? 0 : boards.length - 1)
        } else {
          setMoveIndex((i) => Math.max(0, Math.min(boards.length - 1, i + delta)))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, fork, boards.length])

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
        {' '}{playerBlack} (B) vs {playerWhite} (W)
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
            max={boards.length - 1}
            value={moveIndex}
            onChange={(e) => setMoveIndex(Number(e.target.value))}
            style={{ width: `${boardWidth}px` }}
          />
        ) : (
          <input
            type="range"
            min={0}
            max={boards.length - 1}
            value={Math.min(forkIndex, boards.length - 1)}
            onChange={(e) => setForkIndex(Math.min(Number(e.target.value), fork!.length))}
            style={{ width: `${boardWidth}px` }}
          />
        )}
      </div>
      <div>
        <button onClick={handleCheck} disabled={mode === 'viewing'}>Check</button>
      </div>
      {checkReport && (
        <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}>
          {checkReport.divergence == null ? (
            <span style={{ color: 'green', fontWeight: 'bold' }}>On track</span>
          ) : (
            <>
              {/*
              <div>
                <a href="#" onClick={(e) => { e.preventDefault(); setForkIndex(checkReport.forkStart) }} style={{ color: 'inherit' }}>
                  {checkReport.forkStart}
                </a> - Fork starts
              </div>
              */}
              <div style={{ color: 'red' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setForkIndex(checkReport.divergence!) }} style={{ color: 'red' }}>
                  {checkReport.divergence}
                </a> - Divergence starts
              </div>
              <div>
                <a href="#" onClick={(e) => { e.preventDefault(); setForkIndex(checkReport.forkEnd) }} style={{ color: 'inherit' }}>
                  {checkReport.forkEnd}
                </a> - Fork ends
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default App

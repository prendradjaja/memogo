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
  const [sgfText, setSgfText] = useState<string | null>(null)
  const [moveIndex, setMoveIndex] = useState(0)
  const [fork, setFork] = useState<Move[] | null>(null)
  const [forkIndex, setForkIndex] = useState(0)

  const mode: 'viewing' | 'recalling' = fork ? 'recalling' : 'viewing'

  useEffect(() => {
    fetch('/example.sgf')
      .then((res) => res.text())
      .then(setSgfText)
  }, [])

  const { boards, moves } = useMemo(() => {
    if (!sgfText) return { boards: [Board.fromDimensions(19)], moves: [] as Move[] }
    const rootNodes = sgf.parse(sgfText) as SgfNode[]
    const moves = extractMoves(rootNodes[0])
    return { boards: replayMoves(moves), moves }
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

  const hasDiverged = fork != null && fork.some((m, i) =>
    !moves[i] || m.vertex[0] !== moves[i].vertex[0] || m.vertex[1] !== moves[i].vertex[1] || m.sign !== moves[i].sign
  )

  if (!sgfText) return <>Loading...</>

  return (
    <>
      <SimpleGoban
        signMap={currentBoard.signMap}
        cellSize={30}
        ghostSign={displaySign}
        onVertexClick={handleVertexClick}
      />
      <div>Next: {displaySign === 1 ? 'Black' : 'White'}</div>
      {hasDiverged && <div style={{ color: 'red', fontWeight: 'bold' }}>Diverged from game</div>}
      {mode === 'viewing' ? (
        <input
          type="range"
          min={0}
          max={boards.length - 1}
          value={moveIndex}
          onChange={(e) => setMoveIndex(Number(e.target.value))}
          style={{ width: '500px' }}
        />
      ) : (
        <input
          type="range"
          min={0}
          max={boards.length - 1}
          value={Math.min(forkIndex, boards.length - 1)}
          onChange={(e) => setForkIndex(Math.min(Number(e.target.value), fork!.length))}
          style={{ width: '500px' }}
        />
      )}
    </>
  )
}

export default App

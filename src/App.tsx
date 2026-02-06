import { useState, useEffect, useMemo } from 'react'
import SimpleGoban from './SimpleGoban'
import Board from '@sabaki/go-board'
import * as sgf from '@sabaki/sgf'

interface SgfNode {
  id: number
  data: Record<string, string[]>
  parentId: number | null
  children: SgfNode[]
}

function extractMoves(rootNode: SgfNode): { sign: 1 | -1; vertex: [number, number] }[] {
  const moves: { sign: 1 | -1; vertex: [number, number] }[] = []
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

function App() {
  const [sgfText, setSgfText] = useState<string | null>(null)
  const [moveIndex, setMoveIndex] = useState(0)
  const [customBoard, setCustomBoard] = useState<Board | null>(null)

  useEffect(() => {
    fetch('/example.sgf')
      .then((res) => res.text())
      .then(setSgfText)
  }, [])

  const boards = useMemo(() => {
    if (!sgfText) return [Board.fromDimensions(19)]
    const rootNodes = sgf.parse(sgfText) as SgfNode[]
    const moves = extractMoves(rootNodes[0])
    const result = [Board.fromDimensions(19)]
    for (const move of moves) {
      result.push(result[result.length - 1].makeMove(move.sign, move.vertex))
    }
    return result
  }, [sgfText])

  const currentBoard = customBoard ?? boards[moveIndex]

  const handleVertexClick = (x: number, y: number) => {
    const board = customBoard ?? boards[moveIndex]
    if (board.get([x, y]) !== 0) return
    setCustomBoard(board.makeMove(1, [x, y]))
  }

  if (!sgfText) return <>Loading...</>

  return (
    <>
      <SimpleGoban
        signMap={currentBoard.signMap}
        cellSize={30}
        onVertexClick={handleVertexClick}
      />
      <br/>
      {!customBoard && (
        <input
          type="range"
          min={0}
          max={boards.length - 1}
          value={moveIndex}
          onChange={(e) => setMoveIndex(Number(e.target.value))}
          style={{ width: '500px' }}
        />
      )}
    </>
  )
}

export default App

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
  const [currentSign, setCurrentSign] = useState<1 | -1>(1)

  useEffect(() => {
    fetch('/example.sgf')
      .then((res) => res.text())
      .then(setSgfText)
  }, [])

  const { boards, moves } = useMemo(() => {
    if (!sgfText) return { boards: [Board.fromDimensions(19)], moves: [] as { sign: 1 | -1; vertex: [number, number] }[] }
    const rootNodes = sgf.parse(sgfText) as SgfNode[]
    const moves = extractMoves(rootNodes[0])
    const boards = [Board.fromDimensions(19)]
    for (const move of moves) {
      boards.push(boards[boards.length - 1].makeMove(move.sign, move.vertex))
    }
    return { boards, moves }
  }, [sgfText])

  const currentBoard = customBoard ?? boards[moveIndex]

  // Determine next player from slider position
  const nextSignFromSgf: 1 | -1 = moveIndex > 0 && moves[moveIndex - 1]?.sign === 1 ? -1 : 1
  const displaySign = customBoard ? currentSign : nextSignFromSgf

  const handleVertexClick = (x: number, y: number) => {
    const board = customBoard ?? boards[moveIndex]
    if (board.get([x, y]) !== 0) return
    const sign = customBoard ? currentSign : nextSignFromSgf
    setCustomBoard(board.makeMove(sign, [x, y]))
    setCurrentSign(sign === 1 ? -1 : 1)
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMoveIndex(Number(e.target.value))
  }

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
      {!customBoard && (
        <input
          type="range"
          min={0}
          max={boards.length - 1}
          value={moveIndex}
          onChange={handleSliderChange}
          style={{ width: '500px' }}
        />
      )}
    </>
  )
}

export default App

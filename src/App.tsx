import { useState, useEffect, useMemo } from 'react'
import { Goban } from '@sabaki/shudan'
import '@sabaki/shudan/css/goban.css'
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

  useEffect(() => {
    fetch('/example.sgf')
      .then((res) => res.text())
      .then(setSgfText)
  }, [])

  const moves = useMemo(() => {
    if (!sgfText) return []
    const rootNodes = sgf.parse(sgfText) as SgfNode[]
    return extractMoves(rootNodes[0])
  }, [sgfText])

  const board = useMemo(() => {
    let b = Board.fromDimensions(19)
    for (let i = 0; i < moveIndex; i++) {
      b = b.makeMove(moves[i].sign, moves[i].vertex)
    }
    return b
  }, [moves, moveIndex])

  if (!sgfText) return <>Loading...</>

  return (
    <>
      <Goban
        vertexSize={50}
        signMap={board.signMap}
        showCoordinates
      />
      <input
        type="range"
        min={0}
        max={moves.length}
        value={moveIndex}
        onChange={(e) => setMoveIndex(Number(e.target.value))}
        style={{ width: '500px' }}
      />
    </>
  )
}

export default App

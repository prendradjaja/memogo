import { useState } from 'react'
import { Goban } from '@sabaki/shudan'
import '@sabaki/shudan/css/goban.css'

const emptyBoard = Array.from({ length: 19 }, () => Array(19).fill(0))

function App() {
  const [signMap, setSignMap] = useState(emptyBoard)
  const [currentSign, setCurrentSign] = useState<1 | -1>(1)

  return (
    <>
      <Goban
        vertexSize={50}
        signMap={signMap}
        showCoordinates
        onVertexClick={(_evt: unknown, [x, y]: [number, number]) => {
          setSignMap((prev) => {
            const next = prev.map((row) => [...row])
            next[y][x] = next[y][x] === 0 ? currentSign : 0
            return next
          })
          setCurrentSign((s) => (s === 1 ? -1 : 1))
        }}
      />
    </>
  )
}

export default App

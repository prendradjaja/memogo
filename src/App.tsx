import { Goban } from '@sabaki/shudan'
import '@sabaki/shudan/css/goban.css'

const emptyBoard = Array.from({ length: 19 }, () => Array(19).fill(0))

function App() {
  return (
    <>
      <Goban
        vertexSize={50}
        signMap={emptyBoard}
        showCoordinates
      />
    </>
  )
}

export default App

import { useState, useEffect, useMemo, useCallback } from 'react'
import SimpleGoban from './SimpleGoban'
import type { ColorScheme } from './SimpleGoban'
import Board from '@sabaki/go-board'
import * as sgf from '@sabaki/sgf'

type Move = { sign: 1 | -1; vertex: [number, number] }

const DEFAULT_MOVE_STEP = 25
const MOVE_STEP_OPTIONS = [1, 5, 12.5, 25, 50, 100, 999]

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
  try {
    return encodeURIComponent(btoa(text))
  } catch {
    // e.g. if the SGF contains characters btoa() can't handle
    return ''
  }
}

function decodeHash(hash: string): string {
  return atob(decodeURIComponent(hash))
}

function getInitialSgfText(): string | null {
  const hash = location.hash.slice(1)
  if (hash) {
    return decodeHash(hash)
  }
  return null
}

function App() {
  const [sgfText, setSgfText] = useState<string | null>(getInitialSgfText)
  const [moveIndex, setMoveIndex] = useState(0)
  const [moveStep, setMoveStep] = useState(() => Number(localStorage.getItem('moveStep')) || DEFAULT_MOVE_STEP)
  const [customPageEnd, setCustomPageEnd] = useState<number | null>(null)
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    () => (localStorage.getItem('colorScheme') === 'board' ? 'board' : 'kifu')
  )
  const [rotated, setRotated] = useState(false)

  const loadFile = (file: File) => {
    file.text().then((text) => {
      location.hash = encodeHash(text)
      setSgfText(text)
      setMoveIndex(0)
    })
  }

  const handleClearFile = () => {
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

  const handleToggleColorScheme = () => {
    setColorScheme((current) => {
      const next = current === 'kifu' ? 'board' : 'kifu'
      localStorage.setItem('colorScheme', next)
      return next
    })
  }

  const handleToggleRotate = () => {
    setRotated((current) => !current)
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

  const maxMoveIndex = moves.length > 0 ? Math.floor((moves.length - 1) / moveStep) * moveStep : 0
  const displayMoveIndex = Math.round(moveIndex)
  const pageEnd = customPageEnd !== null
    ? Math.min(customPageEnd, moves.length)
    : Math.min(Math.round(moveIndex + moveStep), moves.length)

  const changeMovesPerPage = useCallback((n: number) => {
    localStorage.setItem('moveStep', String(n))
    setMoveStep(n)
    setMoveIndex((currentIndex) => {
      const newMaxMoveIndex = moves.length > 0 ? Math.floor((moves.length - 1) / n) * n : 0
      const firstMoveOnPage = Math.round(currentIndex) + 1
      return Math.max(0, Math.min(newMaxMoveIndex, Math.floor((firstMoveOnPage - 1) / n) * n))
    })
  }, [moves.length])

  const handleMovesPerPage = () => {
    const input = prompt(`Moves per page (default: ${DEFAULT_MOVE_STEP}):`)
    if (input == null || input === '') return
    const n = Number(input)
    if (isNaN(n) || n <= 0) return
    changeMovesPerPage(n)
  }

  const handleCustomRange = useCallback(() => {
    const input = prompt('Move number range (e.g. 12-20):')
    if (input == null) return
    const match = input.trim().match(/^(\d+)-(\d+)$/)
    if (!match) {
      alert('Invalid format. Expected a range like 12-20.')
      return
    }
    const start = Number(match[1])
    const end = Number(match[2])
    if (start < 1 || end < start || end > moves.length) {
      alert('Invalid range.')
      return
    }
    setMoveIndex(start - 1)
    setCustomPageEnd(end)
  }, [moves.length])

  const goToMoveNumber = useCallback((n: number) => {
    setMoveIndex(Math.max(0, Math.min(maxMoveIndex, Math.floor((n - 1) / moveStep) * moveStep)))
  }, [maxMoveIndex, moveStep])

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
        goToMoveNumber(n)
        return
      }

      if (e.key === 'c') {
        handleCustomRange()
        return
      }

      if (e.key === 'f') {
        handleToggleRotate()
        return
      }

      if (e.key === ' ' && !e.altKey) {
        e.preventDefault()
        setCustomPageEnd(null)
        setMoveIndex((i) => Math.min(maxMoveIndex, i + moveStep))
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (e.key === 'ArrowUp') {
          const next = MOVE_STEP_OPTIONS.find(o => o > moveStep) ?? moveStep
          changeMovesPerPage(next)
        } else {
          const prev = [...MOVE_STEP_OPTIONS].reverse().find(o => o < moveStep) ?? moveStep
          changeMovesPerPage(prev)
        }
        return
      }

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      setCustomPageEnd(null)
      if (e.altKey) {
        setMoveIndex(e.key === 'ArrowLeft' ? 0 : maxMoveIndex)
      } else if (e.key === 'ArrowRight') {
        setMoveIndex((i) => Math.min(maxMoveIndex, i + moveStep))
      } else {
        setMoveIndex((i) => Math.max(0, i - moveStep))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [maxMoveIndex, moveStep, goToMoveNumber, changeMovesPerPage, handleCustomRange, handleToggleRotate])

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

  const movesWord = moveStep !== 1 ? 'moves' : 'move'
  let movesPerPageButtonText = `${moveStep} ${movesWord} per page`
  if (moveStep !== 1) {
    movesPerPageButtonText += ` (${displayMoveIndex + 1} to ${pageEnd})`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleClearFile} style={{ marginRight: '10px' }}>-</button>
        {playerBlack} (B) vs {playerWhite} (W)
        <button onClick={handleDownloadSgf} style={{ marginLeft: '50px' }}>SGF</button>
        <button onClick={handleToggleColorScheme} style={{ marginLeft: '50px' }}>
          Colors
        </button>
        <button onClick={handleToggleRotate} style={{ marginLeft: '10px' }}>
          Flip
        </button>
        <button onClick={handleMovesPerPage} style={{ marginLeft: '50px' }}>{movesPerPageButtonText}</button>
        <button onClick={handleCustomRange} style={{ marginLeft: '10px' }}>C</button>
        <button onClick={() => { setCustomPageEnd(null); setMoveIndex((i) => Math.max(0, i - moveStep)); }} style={{ marginLeft: '10px' }}>{'<'}</button>
        <button onClick={() => { setCustomPageEnd(null); setMoveIndex((i) => Math.min(maxMoveIndex, i + moveStep)); }}>{'>'}</button>
      </div>
      <SimpleGoban
        signMap={displaySignMap}
        cellSize={cellSize}
        moveNumbers={moveNumbers}
        symbols={symbols}
        colorScheme={colorScheme}
        rotate180={rotated}
        showCoordinates
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

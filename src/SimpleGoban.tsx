import { useRef, useEffect, useCallback } from 'react'
import type { SignMap } from '@sabaki/go-board'

export type ColorScheme = 'kifu' | 'board'

const COLOR_SCHEMES: Record<ColorScheme, {
  board: string
  line: string
  blackFill: string
  blackStroke: string
  whiteFill: string
  whiteStroke: string
}> = {
  kifu: {
    board: 'white',
    line: 'black',
    blackFill: '#000',
    blackStroke: '#000',
    whiteFill: '#fff',
    whiteStroke: '#000',
  },
  board: {
    board: '#DEB887',
    line: '#8B4513',
    blackFill: '#111',
    blackStroke: '#000',
    whiteFill: '#fff',
    whiteStroke: '#fff',
  },
}

function getStarPoints(size: number): [number, number][] {
  if (size === 19) {
    const pts = [3, 9, 15]
    return pts.flatMap((x) => pts.map((y) => [x, y] as [number, number]))
  }
  if (size === 13) {
    const pts = [3, 6, 9]
    return pts.flatMap((x) => pts.map((y) => [x, y] as [number, number]))
  }
  if (size === 9) {
    return [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]]
  }
  return []
}

interface SimpleGobanProps {
  signMap: SignMap
  cellSize?: number
  moveNumbers?: (number | null)[][]
  symbols?: ('t' | 's' | null)[][]
  colorScheme?: ColorScheme
}

export default function SimpleGoban({ signMap, cellSize = 30, moveNumbers, symbols, colorScheme = 'kifu' }: SimpleGobanProps) {
  const colors = COLOR_SCHEMES[colorScheme]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rows = signMap.length
  const cols = signMap[0].length
  const padding = cellSize * 0.6
  const width = (cols - 1) * cellSize + padding * 2
  const height = (rows - 1) * cellSize + padding * 2

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Board background
    ctx.fillStyle = colors.board
    ctx.fillRect(0, 0, width, height)

    // Grid lines
    ctx.strokeStyle = colors.line
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < cols; x++) {
      const px = Math.floor(padding + x * cellSize) + 0.5
      ctx.moveTo(px, Math.floor(padding) + 0.5)
      ctx.lineTo(px, Math.floor(padding + (rows - 1) * cellSize) + 0.5)
    }
    for (let y = 0; y < rows; y++) {
      const py = Math.floor(padding + y * cellSize) + 0.5
      ctx.moveTo(Math.floor(padding) + 0.5, py)
      ctx.lineTo(Math.floor(padding + (cols - 1) * cellSize) + 0.5, py)
    }
    ctx.stroke()

    // Star points
    const starPoints = getStarPoints(Math.min(rows, cols))
    ctx.fillStyle = colors.line
    for (const [x, y] of starPoints) {
      ctx.beginPath()
      ctx.arc(Math.floor(padding + x * cellSize) + 0.5, Math.floor(padding + y * cellSize) + 0.5, cellSize * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }

    // Stones
    const r = cellSize * 0.45
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const sign = signMap[y][x]
        if (sign === 0) continue
        const cx = Math.floor(padding + x * cellSize) + 0.5
        const cy = Math.floor(padding + y * cellSize) + 0.5
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = sign === 1 ? colors.blackFill : colors.whiteFill
        ctx.fill()
        ctx.strokeStyle = sign === 1 ? colors.blackStroke : colors.whiteStroke
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Move numbers and symbols
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const symbol = symbols?.[y]?.[x]
        const label = moveNumbers?.[y]?.[x]
        const cx = Math.floor(padding + x * cellSize) + 0.5
        const cy = Math.floor(padding + y * cellSize) + 0.5
        const sign = signMap[y][x]
        const color = sign === 1 ? '#fff' : '#111'

        if (symbol === 't') {
          const r = cellSize * 0.28
          const angle = -Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
          ctx.lineTo(cx + r * Math.cos(angle + (2 * Math.PI) / 3), cy + r * Math.sin(angle + (2 * Math.PI) / 3))
          ctx.lineTo(cx + r * Math.cos(angle + (4 * Math.PI) / 3), cy + r * Math.sin(angle + (4 * Math.PI) / 3))
          ctx.closePath()
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else if (symbol === 's') {
          const s = cellSize * 0.22
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.strokeRect(cx - s, cy - s, s * 2, s * 2)
        } else if (label != null) {
          ctx.font = '25px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = color
          ctx.fillText(String(label), cx, cy)
        }
      }
    }
  }, [signMap, cellSize, moveNumbers, symbols, rows, cols, padding, width, height, colors])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
    />
  )
}

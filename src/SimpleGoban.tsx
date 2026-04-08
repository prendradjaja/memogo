import { useRef, useEffect, useCallback } from 'react'
import type { SignMap } from '@sabaki/go-board'

const BOARD_COLOR = 'white'
const LINE_COLOR = 'black'

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
  annotations?: (string | null)[][]
}

export default function SimpleGoban({ signMap, cellSize = 30, annotations }: SimpleGobanProps) {
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
    ctx.fillStyle = BOARD_COLOR
    ctx.fillRect(0, 0, width, height)

    // Grid lines
    ctx.strokeStyle = LINE_COLOR
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < cols; x++) {
      const px = padding + x * cellSize
      ctx.moveTo(px, padding)
      ctx.lineTo(px, padding + (rows - 1) * cellSize)
    }
    for (let y = 0; y < rows; y++) {
      const py = padding + y * cellSize
      ctx.moveTo(padding, py)
      ctx.lineTo(padding + (cols - 1) * cellSize, py)
    }
    ctx.stroke()

    // Star points
    const starPoints = getStarPoints(Math.min(rows, cols))
    ctx.fillStyle = LINE_COLOR
    for (const [x, y] of starPoints) {
      ctx.beginPath()
      ctx.arc(padding + x * cellSize, padding + y * cellSize, cellSize * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }

    // Stones
    const r = cellSize * 0.45
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const sign = signMap[y][x]
        if (sign === 0) continue
        const cx = padding + x * cellSize
        const cy = padding + y * cellSize
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = sign === 1 ? '#000' : '#fff'
        ctx.fill()
        ctx.strokeStyle = sign === 1 ? '#000' : 'fff'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Annotations
    if (annotations) {
      ctx.font = '25px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const label = annotations[y]?.[x]
          if (!label) continue
          const sign = signMap[y][x]
          ctx.fillStyle = sign === 1 ? '#fff' : '#111'
          ctx.fillText(label, padding + x * cellSize, padding + y * cellSize)
        }
      }
    }
  }, [signMap, cellSize, annotations, rows, cols, padding, width, height])

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

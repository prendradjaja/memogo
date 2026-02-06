import { useRef, useEffect, useCallback } from 'react'
import type { SignMap } from '@sabaki/go-board'

const BOARD_COLOR = '#DEB887'
const LINE_COLOR = '#8B4513'

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
  ghostSign?: 1 | -1
  onVertexClick?: (x: number, y: number) => void
}

export default function SimpleGoban({ signMap, cellSize = 30, ghostSign, onVertexClick }: SimpleGobanProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<{ x: number; y: number } | null>(null)
  const rows = signMap.length
  const cols = signMap[0].length
  const padding = cellSize / 2
  const width = (cols - 1) * cellSize + padding * 2
  const height = (rows - 1) * cellSize + padding * 2

  const draw = useCallback((ghost?: { x: number; y: number } | null) => {
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
        ctx.fillStyle = sign === 1 ? '#111' : '#fff'
        ctx.fill()
        ctx.strokeStyle = sign === 1 ? '#000' : '#888'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Ghost stone
    if (ghost && ghostSign && signMap[ghost.y][ghost.x] === 0) {
      const cx = padding + ghost.x * cellSize
      const cy = padding + ghost.y * cellSize
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = ghostSign === 1 ? '#111' : '#fff'
      ctx.fill()
      ctx.strokeStyle = ghostSign === 1 ? '#000' : '#888'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [signMap, cellSize, ghostSign, rows, cols, padding, width, height])

  useEffect(() => {
    draw(hoverRef.current)
  }, [draw])

  const toVertex = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left - padding) / cellSize)
    const y = Math.round((e.clientY - rect.top - padding) / cellSize)
    if (x >= 0 && x < cols && y >= 0 && y < rows) return { x, y }
    return null
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onVertexClick) return
    const v = toVertex(e)
    if (v) onVertexClick(v.x, v.y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const v = toVertex(e)
    const prev = hoverRef.current
    if (v?.x === prev?.x && v?.y === prev?.y) return
    hoverRef.current = v
    draw(v)
  }

  const handleMouseLeave = () => {
    hoverRef.current = null
    draw(null)
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
}

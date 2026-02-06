import { useRef, useEffect } from 'react'
import type { SignMap } from '@sabaki/go-board'

const BOARD_COLOR = '#DEB887'
const LINE_COLOR = '#8B4513'

interface SimpleGobanProps {
  signMap: SignMap
  cellSize?: number
}

export default function SimpleGoban({ signMap, cellSize = 30 }: SimpleGobanProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rows = signMap.length
  const cols = signMap[0].length
  const padding = cellSize
  const width = (cols - 1) * cellSize + padding * 2
  const height = (rows - 1) * cellSize + padding * 2

  useEffect(() => {
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
  }, [signMap, cellSize, rows, cols, padding, width, height])

  return <canvas ref={canvasRef} width={width} height={height} />
}

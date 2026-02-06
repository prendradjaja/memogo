import type { SignMap } from '@sabaki/go-board'

const BOARD_COLOR = '#DEB887'
const LINE_COLOR = '#8B4513'

interface SimpleGobanProps {
  signMap: SignMap
  cellSize?: number
}

export default function SimpleGoban({ signMap, cellSize = 30 }: SimpleGobanProps) {
  const rows = signMap.length
  const cols = signMap[0].length
  const padding = cellSize
  const width = (cols - 1) * cellSize + padding * 2
  const height = (rows - 1) * cellSize + padding * 2

  return (
    <svg width={width} height={height}>
      <rect width={width} height={height} fill={BOARD_COLOR} />
      {/* Grid lines */}
      {Array.from({ length: cols }, (_, x) => (
        <line
          key={`v${x}`}
          x1={padding + x * cellSize}
          y1={padding}
          x2={padding + x * cellSize}
          y2={padding + (rows - 1) * cellSize}
          stroke={LINE_COLOR}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: rows }, (_, y) => (
        <line
          key={`h${y}`}
          x1={padding}
          y1={padding + y * cellSize}
          x2={padding + (cols - 1) * cellSize}
          y2={padding + y * cellSize}
          stroke={LINE_COLOR}
          strokeWidth={1}
        />
      ))}
      {/* Stones */}
      {signMap.flatMap((row, y) =>
        row.map((sign, x) =>
          sign !== 0 ? (
            <circle
              key={`${x},${y}`}
              cx={padding + x * cellSize}
              cy={padding + y * cellSize}
              r={cellSize * 0.45}
              fill={sign === 1 ? '#111' : '#fff'}
              stroke={sign === 1 ? '#000' : '#888'}
              strokeWidth={1}
            />
          ) : null
        )
      )}
    </svg>
  )
}

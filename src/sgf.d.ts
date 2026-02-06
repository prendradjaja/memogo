declare module '@sabaki/sgf' {
  export function parse(contents: string, options?: Record<string, unknown>): unknown[]
  export function parseVertex(input: string): [number, number]
  export function stringifyVertex(vertex: [number, number]): string
}

import { ColorType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/ColorType'

// Generate a random color
export function generateRandomColor(): ColorType {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
    '#F8C471',
    '#82E0AA',
    '#F1948A',
    '#85C1E9',
    '#D7BDE2',
    '#A9CCE3',
    '#F9E79F',
    '#D5A6BD',
    '#A2D9CE',
    '#FAD7A0',
  ]
  return colors[Math.floor(Math.random() * colors.length)] as ColorType
}

export function pickEvenly(base: string[], count: number): string[] {
  if (!base.length || count <= 0) return []
  const n = base.length
  if (count === 1) return [base[Math.floor((n - 1) / 2)]]
  if (count <= n) {
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i * (n - 1)) / (count - 1))
      return base[idx]
    })
  }
  return Array.from({ length: count }, (_, i) => base[i % n])
}

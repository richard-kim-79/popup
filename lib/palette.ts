// ── Pantone 2026 공유 팔레트 ─────────────────────────────────
// ButtonBlock과 ColorTheme 양쪽에서 import하는 단일 출처

export interface PaletteColor {
  hex: string
  label: string
}

export interface PaletteGroup {
  label: string
  colors: PaletteColor[]
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    label: 'Basic',
    colors: [
      { hex: '#2E6B52', label: 'Forest Green' },
      { hex: '#1C1917', label: 'Charcoal' },
      { hex: '#FFFFFF', label: 'White' },
    ],
  },
  {
    label: 'Powdered Pastels',
    colors: [
      { hex: '#EDE8E2', label: 'Cloud Dancer' },
      { hex: '#EAE6BE', label: 'Lemon Icing' },
      { hex: '#BEC4C4', label: 'Nimbus Cloud' },
      { hex: '#DCCFCC', label: 'Raindrops on Roses' },
      { hex: '#C4D4DE', label: 'Ice Melt' },
      { hex: '#E8C8BA', label: 'Peach Dust' },
      { hex: '#A4BAA6', label: 'Almost Aqua' },
      { hex: '#C8BEC8', label: 'Orchid Tint' },
    ],
  },
  {
    label: 'Take a Break',
    colors: [
      { hex: '#C2906C', label: 'Iced Coffee' },
      { hex: '#E4A422', label: 'Mango Mojito' },
      { hex: '#9A7258', label: 'Cocoa Crème' },
      { hex: '#EE8098', label: 'Pink Lemonade' },
      { hex: '#B8B49C', label: 'Tea' },
      { hex: '#F2A872', label: 'Papaya' },
      { hex: '#D08E5C', label: 'Caramel' },
    ],
  },
  {
    label: 'Atmospheric',
    colors: [
      { hex: '#D6D4D0', label: 'Nantucket Breeze' },
      { hex: '#96B8CA', label: 'Alaskan Blue' },
      { hex: '#C2BCCC', label: 'Cosmic Sky' },
      { hex: '#98BAB4', label: 'Aqua Gray' },
      { hex: '#4A78A4', label: 'Regatta' },
      { hex: '#98C0B2', label: 'Rinsing Rivulet' },
      { hex: '#D6CA82', label: 'Dusky Citron' },
    ],
  },
  {
    label: 'Comfort Zone',
    colors: [
      { hex: '#D4C0AE', label: 'Shifting Sand' },
      { hex: '#D49C8C', label: 'Coral Haze' },
      { hex: '#9E9680', label: 'Mountain Trail' },
      { hex: '#DEC4A2', label: 'Amberlight' },
      { hex: '#C8BCAC', label: 'Ashes of Roses' },
      { hex: '#C2A8A2', label: 'Woodrose' },
      { hex: '#A87A6E', label: 'Rose Brown' },
    ],
  },
  {
    label: 'Tropic Tonalities',
    colors: [
      { hex: '#9878AC', label: 'Iris Orchid' },
      { hex: '#7EC0C6', label: 'Capri' },
      { hex: '#A4D66A', label: 'Kiwi Colada' },
      { hex: '#D2E666', label: 'Sunny Lime' },
      { hex: '#EE9E38', label: 'Bright Marigold' },
      { hex: '#E4407A', label: 'Paradise Pink' },
      { hex: '#F6DA38', label: 'Blazing Yellow' },
    ],
  },
  {
    label: 'Light & Shadow',
    colors: [
      { hex: '#DCDFD8', label: 'Veiled Vista' },
      { hex: '#A6C6D2', label: 'Baltic Sea' },
      { hex: '#E6DA94', label: 'Golden Mist' },
      { hex: '#B0A8BE', label: 'Quiet Violet' },
      { hex: '#C6AE9C', label: 'Cloud Cover' },
      { hex: '#9A9890', label: 'Hematite' },
      { hex: '#6890A8', label: 'Blue Fusion' },
    ],
  },
  {
    label: 'Glamour & Gleam',
    colors: [
      { hex: '#1C1E22', label: 'Stretch Limo' },
      { hex: '#BE2020', label: 'Scarlet Smile' },
      { hex: '#8E4E60', label: 'Bordeaux' },
      { hex: '#1C4840', label: 'Dragonfly' },
      { hex: '#5C5A58', label: 'Graphite' },
      { hex: '#E0D8D2', label: 'Satin Slipper' },
      { hex: '#CAC2BC', label: 'Micron' },
    ],
  },
]

// ── 색상 유틸 ───────────────────────────────────────────────

export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function darken(hex: string, amount = 0.12): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function getFgColor(hex: string): string {
  return luminance(hex) > 0.55 ? '#1C1917' : '#FFFFFF'
}

export const SESSION_KEY = 'popup-accent-color'

/**
 * :root CSS 변수를 즉시 교체하고 sessionStorage에 저장.
 * ColorTheme(초기화)과 ButtonBlock(팔레트 선택) 양쪽에서 호출.
 */
export function applyAccentColor(hex: string): void {
  const root = document.documentElement
  root.style.setProperty('--color-popup-accent',       hex)
  root.style.setProperty('--color-popup-accent-hover', darken(hex))
  root.style.setProperty('--color-popup-accent-fg',    getFgColor(hex))
  sessionStorage.setItem(SESSION_KEY, hex)
}

// UI 버튼 accent용 — 흰색(#FFFFFF) 제외, 너무 연한 색(밝기 > 0.88)도 제외
export const ACCENT_PALETTE: string[] = PALETTE_GROUPS
  .flatMap(g => g.colors.map(c => c.hex))
  .filter(hex => hex !== '#FFFFFF' && luminance(hex) < 0.88)

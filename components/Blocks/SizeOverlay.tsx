'use client'

import type { ImageWidth } from '@/types'

export const SIZE_OPTIONS: { key: ImageWidth; label: string; bars: number }[] = [
  { key: 'small',  label: '소', bars: 1 },
  { key: 'medium', label: '중', bars: 2 },
  { key: 'full',   label: '대', bars: 3 },
]

export const WIDTH_CLASS: Record<ImageWidth, string> = {
  small:  'w-1/3',
  medium: 'w-2/3',
  full:   'w-full',
}

export function getWidthClass(width?: ImageWidth): string {
  return WIDTH_CLASS[width ?? 'full']
}

interface Props {
  current?: ImageWidth
  onChange: (w: ImageWidth) => void
}

/** hover 크기 조절 오버레이 — absolute 배치, 부모에 relative 필요 */
export default function SizeOverlay({ current = 'full', onChange }: Props) {
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur-sm"
        onMouseEnter={(e) => e.stopPropagation()}
      >
        {SIZE_OPTIONS.map(({ key, label, bars }) => {
          const active = current === key
          return (
            <button
              key={key}
              onClick={(e) => { e.stopPropagation(); onChange(key) }}
              title={label}
              className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all ${
                active ? 'bg-white text-black' : 'text-white/80 hover:bg-white/20'
              }`}
            >
              <span className="flex gap-[3px] items-end">
                {Array.from({ length: bars }).map((_, i) => (
                  <span
                    key={i}
                    className="block rounded-sm"
                    style={{
                      width: 3,
                      height: 4 + i * 3,
                      background: active ? 'black' : 'white',
                      opacity: active ? 1 : 0.8,
                    }}
                  />
                ))}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

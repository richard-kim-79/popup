'use client'

interface Props {
  daysLeft: number
  onUpgrade: () => void
  onDismiss: () => void
}

export default function LockBanner({ daysLeft, onUpgrade, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between bg-popup-warn-bg px-4 py-2 text-xs">
      <span className="text-popup-warn">
        {daysLeft}일 후 잠깁니다
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onUpgrade}
          className="rounded px-2.5 py-1 font-medium text-popup-warn underline underline-offset-2"
        >
          연장하기
        </button>
        <button onClick={onDismiss} aria-label="닫기" className="text-popup-faint hover:text-popup-muted">
          ×
        </button>
      </div>
    </div>
  )
}

interface Props {
  id: string
  onDelete: (id: string) => void
}

export default function DividerBlock({ id, onDelete }: Props) {
  return (
    <div className="group flex items-center gap-2 py-1">
      <hr className="flex-1 border-t border-popup-border" />
      <button
        onClick={() => onDelete(id)}
        aria-label="블록 삭제"
        className="flex h-7 w-7 items-center justify-center rounded text-popup-faint transition-opacity hover:bg-popup-surface hover:text-popup-muted sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

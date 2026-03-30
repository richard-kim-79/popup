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
        className="flex h-5 w-5 items-center justify-center rounded text-popup-faint opacity-0 transition-opacity hover:bg-popup-surface hover:text-popup-muted group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

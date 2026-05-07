'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Block, ButtonBlock, ImageBlock, TextBlock, YoutubeBlock, LinkBlock } from '@/types'
import TextBlockComp from '@/components/Blocks/TextBlock'
import ImageBlockComp from '@/components/Blocks/ImageBlock'
import ButtonBlockComp from '@/components/Blocks/ButtonBlock'
import DividerBlockComp from '@/components/Blocks/DividerBlock'
import YoutubeBlockComp from '@/components/Blocks/YoutubeBlock'
import LinkBlockComp from '@/components/Blocks/LinkBlock'

interface Props {
  blocks: Block[]
  slug: string
  editToken: string
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Block>) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onReorder: (blocks: Block[]) => void
  onAddFilesBelow: (afterId: string, files: File[]) => void
  pendingFiles: Map<string, File>
}

/* ── 블록 타입 라벨 ────────────────────────────────── */
const BLOCK_LABELS: Record<string, string> = {
  h1: '제목', h2: '소제목', text: '텍스트', image: '이미지',
  button: '버튼', divider: '구분선', youtube: '유튜브', link: '링크',
}

/* ── 드래그 중 플로팅 카드 (DragOverlay) ───────────── */
function BlockDragCard({ block }: { block: Block }) {
  const label = BLOCK_LABELS[block.type] ?? block.type
  const preview = (() => {
    if (block.type === 'h1' && 'content' in block) return block.content || '제목'
    if (block.type === 'h2' && 'content' in block) return block.content || '소제목'
    if (block.type === 'text' && 'content' in block) return block.content || '텍스트'
    if (block.type === 'button' && 'label' in block) return (block as ButtonBlock).label || '버튼'
    return label
  })()

  return (
    <div className="flex cursor-grabbing items-center gap-3 rounded-xl border border-popup-accent bg-popup-white px-4 py-3 shadow-2xl ring-2 ring-popup-accent/20">
      {/* 핸들 아이콘 */}
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" className="shrink-0 text-popup-accent">
        <circle cx="3.5" cy="2.5" r="1.5" />
        <circle cx="8.5" cy="2.5" r="1.5" />
        <circle cx="3.5" cy="8" r="1.5" />
        <circle cx="8.5" cy="8" r="1.5" />
        <circle cx="3.5" cy="13.5" r="1.5" />
        <circle cx="8.5" cy="13.5" r="1.5" />
      </svg>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-popup-accent">{label}</p>
        <p className="truncate text-sm text-popup-text">{String(preview).slice(0, 40) || label}</p>
      </div>
    </div>
  )
}

/* ── 드래그 핸들 (리스너를 핸들에만 적용 → 텍스트 선택 충돌 방지) ── */
function DragHandle({
  listeners,
  attributes,
}: {
  listeners?: DraggableSyntheticListeners
  attributes?: DraggableAttributes
}) {
  return (
    <div
      {...listeners}
      {...attributes}
      aria-label="블록 이동"
      title="드래그해서 순서 변경"
      className="mt-0.5 flex h-10 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-popup-faint transition-colors duration-200 active:cursor-grabbing sm:h-8 sm:w-5 sm:opacity-0 sm:group-hover:opacity-60"
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3.5" cy="2.5" r="1.5" />
        <circle cx="8.5" cy="2.5" r="1.5" />
        <circle cx="3.5" cy="8" r="1.5" />
        <circle cx="8.5" cy="8" r="1.5" />
        <circle cx="3.5" cy="13.5" r="1.5" />
        <circle cx="8.5" cy="13.5" r="1.5" />
      </svg>
    </div>
  )
}

/* ── 정렬 가능 블록 래퍼 ────────────────────────────── */
function SortableBlock({
  block, slug, editToken, selectedId, onSelect, onUpdate, onDelete, onAddBelow, onAddFilesBelow, initialFile,
}: {
  block: Block
  slug: string
  editToken: string
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Block>) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onAddFilesBelow: (files: File[]) => void
  initialFile?: File
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  // listeners/attributes를 DragHandle에만 적용 → 텍스트 블록 내 드래그 선택과 충돌 없음

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 200ms ease',
  }

  const isSelected = selectedId === block.id

  const content = (() => {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'text') {
      return (
        <div className={block.type === 'h1' ? 'mb-3' : block.type === 'h2' ? 'mb-2' : 'mb-1'}>
          <TextBlockComp
            block={block as TextBlock}
            selected={isSelected}
            onUpdate={(id, c) => onUpdate(id, { content: c })}
            onDelete={onDelete}
            onAddBelow={onAddBelow}
            onSelect={onSelect}
          />
        </div>
      )
    }
    if (block.type === 'image') {
      return (
        <div className="mb-4">
          <ImageBlockComp
            block={block as ImageBlock}
            slug={slug}
            editToken={editToken}
            onUpdate={(id, patch) => onUpdate(id, patch as Partial<ImageBlock>)}
            onDelete={onDelete}
            onAddFilesBelow={onAddFilesBelow}
            initialFile={initialFile}
          />
        </div>
      )
    }
    if (block.type === 'button') {
      return (
        <div>
          <ButtonBlockComp
            block={block as ButtonBlock}
            selected={isSelected}
            onUpdate={(id, patch) => onUpdate(id, patch)}
            onDelete={onDelete}
            onAddBelow={onAddBelow}
            onSelect={onSelect}
          />
        </div>
      )
    }
    if (block.type === 'divider') {
      return <DividerBlockComp id={block.id} onDelete={onDelete} />
    }
    if (block.type === 'youtube') {
      return (
        <div className="mb-4">
          <YoutubeBlockComp
            block={block as YoutubeBlock}
            onUpdate={(id, patch) => onUpdate(id, patch)}
            onDelete={onDelete}
          />
        </div>
      )
    }
    if (block.type === 'link') {
      return (
        <div className="mb-4">
          <LinkBlockComp
            block={block as LinkBlock}
            onUpdate={(id, patch) => onUpdate(id, patch)}
            onDelete={onDelete}
          />
        </div>
      )
    }
    return null
  })()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1.5"
    >
      {/* 핸들에만 listeners/attributes → 텍스트 선택과 충돌 없음 */}
      <DragHandle listeners={listeners} attributes={attributes} />
      {/* 드래그 중: 점선 ghost placeholder */}
      {isDragging ? (
        <div className="min-h-[40px] flex-1 rounded-lg border-2 border-dashed border-popup-accent/40 bg-popup-accent-bg/30" />
      ) : (
        <div className="min-w-0 flex-1">{content}</div>
      )}
    </div>
  )
}

/* ── BlockList ─────────────────────────────────────── */
export default function BlockList({
  blocks, slug, editToken, selectedId, onSelect, onUpdate, onDelete, onAddBelow, onReorder, onAddFilesBelow, pendingFiles,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    // distance: 8 → 핸들에서 살짝 움직여도 드래그 시작, 오탭 클릭 방지
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // 모바일 길게 누르기 200ms → 드래그 시작
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    onReorder(arrayMove(blocks, oldIdx, newIdx))
  }

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5">
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              slug={slug}
              editToken={editToken}
              selectedId={selectedId}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddBelow={onAddBelow}
              onAddFilesBelow={(files) => onAddFilesBelow(block.id, files)}
              initialFile={pendingFiles.get(block.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* 드래그 중 플로팅 카드 */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeBlock ? <BlockDragCard block={activeBlock} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

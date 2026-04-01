'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  type DraggableAttributes,
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

function DragHandle({ listeners, attributes }: {
  listeners: DraggableSyntheticListeners
  attributes: DraggableAttributes
}) {
  return (
    <button
      type="button"
      {...listeners}
      {...attributes}
      aria-label="블록 이동"
      tabIndex={-1}
      className="mt-1 flex h-8 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded text-popup-faint opacity-60 transition-opacity active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-60"
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3.5" cy="2.5" r="1.5" />
        <circle cx="8.5" cy="2.5" r="1.5" />
        <circle cx="3.5" cy="8" r="1.5" />
        <circle cx="8.5" cy="8" r="1.5" />
        <circle cx="3.5" cy="13.5" r="1.5" />
        <circle cx="8.5" cy="13.5" r="1.5" />
      </svg>
    </button>
  )
}

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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
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
    <div ref={setNodeRef} style={style} className="group flex items-start gap-1.5">
      <DragHandle listeners={listeners} attributes={attributes} />
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  )
}

export default function BlockList({
  blocks, slug, editToken, selectedId, onSelect, onUpdate, onDelete, onAddBelow, onReorder, onAddFilesBelow, pendingFiles,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    onReorder(arrayMove(blocks, oldIdx, newIdx))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
    </DndContext>
  )
}

'use client'

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
}

export default function BlockList({ blocks, slug, editToken, selectedId, onSelect, onUpdate, onDelete, onAddBelow }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block) => {
        const isSelected = selectedId === block.id

        if (block.type === 'h1' || block.type === 'h2' || block.type === 'text') {
          return (
            <div key={block.id} className={block.type === 'h1' ? 'mb-3' : block.type === 'h2' ? 'mb-2' : 'mb-1'}>
              <TextBlockComp
                block={block as TextBlock}
                selected={isSelected}
                onUpdate={(id, content) => onUpdate(id, { content })}
                onDelete={onDelete}
                onAddBelow={onAddBelow}
                onSelect={onSelect}
              />
            </div>
          )
        }

        if (block.type === 'image') {
          return (
            <div key={block.id} className="mb-4">
              <ImageBlockComp
                block={block}
                slug={slug}
                editToken={editToken}
                onUpdate={(id, patch) => onUpdate(id, patch as Partial<ImageBlock>)}
                onDelete={onDelete}
              />
            </div>
          )
        }

        if (block.type === 'button') {
          return (
            <div key={block.id}>
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
          return <DividerBlockComp key={block.id} id={block.id} onDelete={onDelete} />
        }

        if (block.type === 'youtube') {
          return (
            <div key={block.id} className="mb-4">
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
            <div key={block.id} className="mb-4">
              <LinkBlockComp
                block={block as LinkBlock}
                onUpdate={(id, patch) => onUpdate(id, patch)}
                onDelete={onDelete}
              />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

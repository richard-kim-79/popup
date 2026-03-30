'use client'

import Editor from '@/components/Editor'

const MOCK_BLOCKS = [
  { id: 'b1', type: 'h1' as const, content: '안녕하세요 👋' },
  { id: 'b2', type: 'text' as const, content: '이 페이지는 Popup으로 만들었어요. 링크 하나로 공유할 수 있어요.' },
  { id: 'b3', type: 'button' as const, label: '자세히 보기', href: 'https://example.com' },
  { id: 'b4', type: 'divider' as const },
  { id: 'b5', type: 'text' as const, content: '로그인 없이 · 30일 무료 · PIN 보호' },
]

export default function PreviewPage() {
  return (
    <Editor
      slug="preview"
      editToken="mock-token"
      initialBlocks={MOCK_BLOCKS}
      daysLeft={28}
      locked={false}
    />
  )
}

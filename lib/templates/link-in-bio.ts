import type { PageTemplate } from '.'

export const linkInBioTemplate: PageTemplate = {
  id: 'link-in-bio',
  name: 'Link in Bio',
  description: 'SNS 프로필 링크 모음 페이지. 여러 링크를 버튼으로 나열.',
  blocks: [
    { type: 'h1', content: '닉네임' },
    { type: 'text', content: '한 줄 소개를 적어주세요.' },
    { type: 'divider' },
    { type: 'button', label: 'Portfolio', href: 'https://example.com' },
    { type: 'button', label: 'Instagram', href: 'https://instagram.com' },
    { type: 'button', label: 'YouTube', href: 'https://youtube.com' },
    { type: 'button', label: 'Blog', href: 'https://example.com/blog' },
  ],
}

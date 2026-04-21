import type { PageTemplate } from '.'

export const landingPageTemplate: PageTemplate = {
  id: 'landing-page',
  name: 'Landing Page',
  description: '제품/서비스 소개 랜딩 페이지. 제목, 설명, CTA 버튼 포함.',
  blocks: [
    { type: 'h1', content: '당신의 제품 이름' },
    { type: 'text', content: '제품이나 서비스에 대한 간결한 소개를 적어주세요. 방문자가 처음 보는 내용이므로 핵심 가치를 전달하세요.' },
    { type: 'divider' },
    { type: 'h2', content: '주요 기능' },
    { type: 'text', content: '첫 번째 기능에 대한 설명을 적어주세요.' },
    { type: 'text', content: '두 번째 기능에 대한 설명을 적어주세요.' },
    { type: 'text', content: '세 번째 기능에 대한 설명을 적어주세요.' },
    { type: 'divider' },
    { type: 'button', label: '시작하기', href: 'https://example.com' },
  ],
}

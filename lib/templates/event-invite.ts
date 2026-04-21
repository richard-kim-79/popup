import type { PageTemplate } from '.'

export const eventInviteTemplate: PageTemplate = {
  id: 'event-invite',
  name: 'Event Invite',
  description: '이벤트/모임 초대 페이지. 일시, 장소, 참여 버튼 포함.',
  blocks: [
    { type: 'h1', content: '이벤트 이름' },
    { type: 'text', content: '이벤트에 대한 간단한 설명을 적어주세요.' },
    { type: 'divider' },
    { type: 'h2', content: '일시 및 장소' },
    { type: 'text', content: '날짜: 2025년 1월 1일 (수) 오후 2시' },
    { type: 'text', content: '장소: 서울시 강남구 테헤란로 123' },
    { type: 'divider' },
    { type: 'h2', content: '참여 방법' },
    { type: 'text', content: '아래 버튼을 눌러 참여를 신청해주세요.' },
    { type: 'button', label: '참여 신청하기', href: 'https://example.com' },
  ],
}

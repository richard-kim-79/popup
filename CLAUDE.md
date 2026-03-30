# CLAUDE.md — Popup Project

## 서비스 개요
**Popup**: 로그인 없이 30초 만에 웹페이지를 만들고 링크로 공유하는 서비스.
핵심 철학: **시간 제한은 결함이 아닌 기능** — 소멸 예정일을 카운트다운으로 보여주며 희소성과 긴장감을 제공.

## 핵심 원칙
- **개방성 극대화**: 로그인 없이 생성·편집·공유
- **엔트로피 최소**: 초보자도 거부감 없는 초단순 UX
- **PIN 기반 편집 보호**: 공유 링크 생성 시 PIN 설정, PIN 보유자만 편집 가능
- **시간 제한 수익화**: 30일 후 잠금 → 유료 플랜으로 유도

## 기술 스택
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **결제**: 토스페이먼츠 (TossPayments SDK)
- **배포**: Vercel

## 폴더 구조
```
/app                    # Next.js App Router 페이지
  /page.tsx             # 랜딩 페이지
  /[slug]/page.tsx      # 공개 페이지 뷰어
  /[slug]/edit/page.tsx # 에디터 (PIN 인증 후)
  /api/pages/           # 페이지 CRUD API
  /api/payments/        # 토스페이먼츠 연동
  /api/auth/            # 인증 (이메일, Google OAuth)
/components
  /Editor/              # 블록 에디터 컴포넌트
  /Blocks/              # 개별 블록 (H1, Text, Image, Button, Divider)
  /Modal/               # 모달 (공유, 업그레이드, PIN)
  /Landing/             # 랜딩 페이지 컴포넌트
/lib
  /supabase.ts          # Supabase 클라이언트 (단일 진입점)
  /api.ts               # 내부 API 래퍼
  /pin.ts               # PIN 해싱/검증 (bcrypt)
/docs                   # 설계 문서
/supabase
  /migrations/          # DB 마이그레이션 파일
  /functions/           # Edge Functions (크론잡 등)
```

## 코딩 규칙
- 모든 DB 접근은 `/lib/supabase.ts`를 통해서만
- 직접 fetch 대신 `/lib/api.ts` 래퍼 사용
- `any` 타입 사용 금지
- `console.log` 프로덕션 코드 금지
- Server Component 우선, interactivity 필요한 것만 `'use client'`
- 커밋 전 `pnpm typecheck && pnpm lint` 통과 필수

## 디자인 토큰
```ts
// tailwind.config.ts에 등록
colors: {
  bg:          '#F7F5F0',
  white:       '#FFFFFF',
  border:      '#E3DFD5',
  text:        '#1A1812',
  muted:       '#A09D92',
  faint:       '#D4D0C4',
  accent:      '#2A6049',   // 메인 그린
  accentHover: '#1E4735',
  accentBg:    '#EDF5F1',
  warn:        '#9A6B00',
  warnBg:      '#FFFBEB',
  warnBorder:  '#E6CE70',
}
```
참고 디자인: `/popup-final.jsx` (랜딩·에디터·모달 전체 구현 포함)

## 막히는 상황 대응
- 환경변수 없음 → `.env.example`에 `TODO` 표시 후 계속
- 외부 API 응답 없음 → mock으로 대체하고 `// TODO` 주석
- 타입 에러 → `any` 쓰지 말고 즉시 보고
- 테스트 실패 → 추측으로 수정하지 말고 원인 분석 후 보고

## 금지사항
- `any` 타입 사용
- `console.log` 프로덕션 코드
- RLS 없는 Supabase 테이블 생성
- PIN 평문 저장 (반드시 bcrypt 해시)
- 결제 웹훅 서명 검증 생략

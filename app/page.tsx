import type { Metadata } from 'next'
import Nav from '@/components/Landing/Nav'
import PricingTeaser from '@/components/Landing/PricingTeaser'
import ClaudeSection from '@/components/Landing/ClaudeSection'
import Footer from '@/components/Landing/Footer'
import LandingClient from '@/components/Landing/LandingClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com'

export const metadata: Metadata = {
  title: '팝업 페이지 만들기 | Popup — 30초, 무료, 로그인 없이',
  description: '팝업 페이지를 30초 만에 무료로 만들어 링크로 공유하세요. 회원가입·로그인 없이 누구나 사용 가능. 글·사진·영상·버튼을 자유롭게 넣어 나만의 팝업 페이지를 완성하세요.',
  keywords: [
    '팝업 페이지 만들기', '팝업 페이지', '팝업 만들기', '팝업 웹페이지',
    '무료 팝업 페이지', '팝업 페이지 무료', '링크 공유 페이지',
    '로그인 없이 웹페이지 만들기', '무료 웹페이지', '웹페이지 만들기 무료',
    '팝업', 'popup',
  ],
  alternates: { canonical: BASE },
  openGraph: {
    title: '팝업 페이지 만들기 | Popup',
    description: '팝업 페이지를 30초 만에 무료로 만들어 링크로 공유하세요. 로그인·회원가입 없이 나만의 팝업 페이지를.',
    type: 'website',
    siteName: 'Popup',
    locale: 'ko_KR',
    url: BASE,
  },
  twitter: {
    card: 'summary_large_image',
    title: '팝업 페이지 만들기 | Popup',
    description: '팝업 페이지를 30초 만에 무료로 만들어 링크로 공유하세요.',
  },
}

// JSON-LD: 화면에 렌더링되지 않고 구글만 읽는 구조화 데이터 (공식 권장 방식)
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Popup — 팝업 페이지 만들기',
      url: BASE,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW',
        description: '30일 무료, 이후 월 1,000원 또는 연 10,000원',
      },
      description: '팝업 페이지를 30초 만에 무료로 만들어 링크로 공유하는 서비스. 로그인·회원가입 없이 누구나 사용 가능.',
      inLanguage: 'ko',
      creator: { '@type': 'Organization', name: '연주미디어' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '팝업 페이지를 무료로 만들 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네. Popup에서는 30일 동안 완전 무료로 팝업 페이지를 만들고 공유할 수 있습니다. 이후 연장은 월 1,000원 또는 연 10,000원입니다.',
          },
        },
        {
          '@type': 'Question',
          name: '로그인 없이 팝업 페이지를 만들 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네. 회원가입이나 로그인 없이 바로 팝업 페이지를 만들 수 있습니다. PIN 번호 하나만 설정하면 됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '팝업 페이지에 사진이나 영상을 넣을 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네. 팝업 페이지에 글, 사진, YouTube 영상, 버튼 링크 등을 자유롭게 넣을 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '팝업 페이지 링크를 어떻게 공유하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '팝업 페이지를 만들면 고유한 링크(URL)가 생성됩니다. 이 링크를 카카오톡, 인스타그램, 문자 등 어디에나 붙여 넣어 공유할 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '팝업 페이지를 수정할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네. 만들 때 설정한 PIN 번호를 입력하면 언제든지 팝업 페이지를 수정할 수 있습니다.',
          },
        },
      ],
    },
  ],
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-popup-bg">

      {/* JSON-LD: 구글만 읽는 구조화 데이터 — 화면에 표시되지 않음 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Nav />

      {/* 히어로 */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-40 pt-64 text-center">
        <h1 className="mb-10 max-w-md text-[1.75rem] font-bold leading-[1.18] tracking-[-0.04em] text-popup-text sm:text-[2.6rem]">
          로그인 없이<br />
          웹페이지 만들고 공유
        </h1>
        <LandingClient />
      </div>

      <PricingTeaser />
      <ClaudeSection />
      <Footer />
    </div>
  )
}

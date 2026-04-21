import type { Metadata } from 'next'
import './globals.css'
import ColorTheme from '@/components/ColorTheme'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://popup2026.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: '팝업 페이지 만들기 | Popup',
    template: '%s | Popup',
  },
  description: '팝업 페이지를 30초 만에 무료로 만들어 링크로 공유하세요. 회원가입·로그인 없이 누구나 사용 가능. 글·사진·영상·버튼을 자유롭게 넣어 나만의 팝업 페이지를 완성하세요.',
  keywords: [
    '팝업 페이지 만들기', '팝업 페이지', '팝업 만들기', '팝업 웹페이지',
    '무료 팝업 페이지', '팝업 페이지 무료', '링크 공유 페이지',
    '로그인 없이 웹페이지 만들기', '무료 웹페이지', '웹페이지 만들기 무료',
    '팝업', 'popup',
  ],
  authors: [{ name: 'Popup' }],
  creator: 'Popup',
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
  alternates: {
    canonical: BASE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full">
        <ColorTheme />
        {children}
        <script src="https://js.tosspayments.com/v2/standard" defer />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Popup — 30초 만에 웹페이지 만들기',
  description: '로그인 없이 바로 웹페이지를 만들고 링크로 공유하세요. 글쓰기, 사진/동영상 업로드, 버튼 링크 — 딱 이것만.',
  openGraph: {
    title: 'Popup',
    description: '30초 만에 웹페이지를 만들고 공유하세요',
    type: 'website',
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
        {children}
        <script src="https://js.tosspayments.com/v2/standard" defer />
      </body>
    </html>
  )
}

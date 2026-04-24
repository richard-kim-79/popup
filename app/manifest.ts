import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Popup — 팝업 페이지 만들기',
    short_name: 'Popup',
    description: '30초 만에 웹페이지를 만들고 링크로 공유하세요',
    start_url: '/',
    display: 'standalone',
    background_color: '#2A6049',
    theme_color: '#2A6049',
    icons: [
      { src: '/icon', sizes: '32x32',   type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}

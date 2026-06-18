import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Jua, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const jua = Jua({
  variable: '--font-jua',
  weight: '400',
  subsets: ['latin'],
})
const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-kr',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '로디 — RAG 기반 법률 챗봇',
  description: '복잡한 법률, 이제 로디에게 물어보세요. 검색 기반 AI가 쉽고 빠르게 답해드립니다.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${jua.variable} ${notoSansKr.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

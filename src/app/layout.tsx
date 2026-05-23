/* file: src/app/layout.tsx */
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DoodleVerse - 涂鸦宇宙数字生命盲盒',
  description: '将儿童简笔画一键转化为3D黏土/毛绒潮玩数字生命的AI共创平台。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👾</text></svg>" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

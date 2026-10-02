import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Video Generator - Tự động tạo video TikTok / Shorts bằng Code & AI',
  description: 'Nền tảng sinh video ngắn tự động từ ý tưởng hoặc URL bài viết với HyperFrames, Remotion và Neural TTS tiếng Việt.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Be+Vietnam+Pro:wght@500;600;700;800&family=Inter:wght@500;600;700;800&family=Montserrat:wght@600;700;800;900&family=Nunito:wght@600;700;800&family=Playfair+Display:wght@700;800&family=Roboto:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

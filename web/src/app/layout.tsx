import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Ethiopic } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

/**
 * Root Layout wraps every page in the application.
 */

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: '--font-noto-ethiopic',
  subsets: ['ethiopic'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Exam Prep Ethiopia',
    template: '%s | Exam Prep Ethiopia',
  },
  description:
    'Prepare for the Ethiopian 12th Grade National Exam with practice questions, mock exams, and progress tracking.',
};

const themeInitScript = `
(() => {
  try {
    const storageKey = 'exam-prep-theme';
    const storedTheme = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{ isolation: 'isolate' }}
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansEthiopic.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { ServiceWorker } from '@/components/service-worker';
import './globals.css';
export const metadata: Metadata = {
  title: 'Organizei',
  description: 'Planejador de fluxo de caixa familiar',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#171817' },
  ],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

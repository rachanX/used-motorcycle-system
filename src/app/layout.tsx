import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'T.Yanyon',
  description: 'ต.ยานยนต์'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        {/* Inline script avoids dark-mode flash on first paint (no external service needed). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

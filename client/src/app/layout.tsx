import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { OfflineBanner } from '../components/layout/OfflineBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'GebaBuna (ገባ ቡና) — Jimma Coffee Transparency & Exchange',
  description:
    'GebaBuna empowers Ethiopian coffee smallholders with transparent reference prices, verified fair buyer badges, and direct marketplace access in Afaan Oromoo, Amharic, and English.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen flex flex-col bg-coffee-50 text-coffee-950 antialiased font-sans">
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 pt-[108px]">
              <OfflineBanner />
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

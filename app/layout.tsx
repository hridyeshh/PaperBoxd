import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { MobileDock } from "@/components/ui/layout/mobile-dock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PaperBoxd - Your Reading Universe",
    template: "%s | PaperBoxd"
  },
  description: "Track, organize, and share the books you love. Discover personalized book recommendations, connect with fellow readers, and build your reading community.",
  keywords: [
    'book tracking',
    'reading list',
    'book social network',
    'goodreads alternative',
    'letterboxd for books',
    'book recommendations',
    'reading tracker',
    'book diary',
    'book reviews',
    'reading community'
  ],
  authors: [{ name: "PaperBoxd" }],
  creator: "PaperBoxd",
  publisher: "PaperBoxd",
  metadataBase: new URL('https://paperboxd.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://paperboxd.in',
    siteName: 'PaperBoxd',
    title: 'PaperBoxd - Your Reading Universe',
    description: 'Track, organize, and share the books you love. Discover personalized book recommendations and connect with fellow readers.',
    images: [
      {
        url: '/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'PaperBoxd Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaperBoxd - Your Reading Universe',
    description: 'Track, organize, and share the books you love. Like Letterboxd, but for books.',
    images: ['/logo.jpg'],
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
  other: {
    'adobe-fonts': 'https://use.typekit.net/fabulosa.css',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const STORAGE_KEY = 'paperboxd-theme';
                const storedTheme = localStorage.getItem(STORAGE_KEY);
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        <Providers>
          {children}
          <MobileDock />
        </Providers>
      </body>
    </html>
  );
}

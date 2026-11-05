import type { Metadata } from 'next';
import { Syne, Inter, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'kzn.visuals — Creative Studio',
  description:
    'Visual storytelling through photography, videography, and creative direction.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", syne.variable, inter.variable, "font-sans", geist.variable)} style={{ colorScheme: 'dark' }}>
      <body className="antialiased bg-[#04050d] text-[#f4f6ff]">{children}</body>
    </html>
  );
}

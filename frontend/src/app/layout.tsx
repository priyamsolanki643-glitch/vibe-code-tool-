import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "FP // Operating System for Human Ambition",
  description: "Strategist and executioner. Compress your ambition into raw, immutable units of work.",
  authors: [{ name: "FP-OS" }],
  openGraph: {
    title: "FP-OS // Operating System for Human Ambition",
    description: "An AI strategist & executioner. Lock your trajectory.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FP-OS // Operating System for Human Ambition",
    description: "An AI strategist & executioner. Lock your trajectory.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground min-h-screen overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}

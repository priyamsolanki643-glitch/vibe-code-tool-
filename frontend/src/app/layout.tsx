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
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23000000'/><ellipse cx='50' cy='50' rx='45' ry='18' fill='none' stroke='%23ffffff' stroke-width='4' stroke-opacity='0.9'><animateTransform attributeName='transform' type='rotate' from='0 50 50' to='360 50 50' dur='3s' repeatCount='indefinite'/></ellipse><ellipse cx='50' cy='50' rx='45' ry='18' fill='none' stroke='%23ffffff' stroke-width='3' stroke-opacity='0.6'><animateTransform attributeName='transform' type='rotate' from='60 50 50' to='420 50 50' dur='4s' repeatCount='indefinite'/></ellipse><ellipse cx='50' cy='50' rx='45' ry='18' fill='none' stroke='%23ffffff' stroke-width='2' stroke-opacity='0.3'><animateTransform attributeName='transform' type='rotate' from='120 50 50' to='480 50 50' dur='5s' repeatCount='indefinite'/></ellipse><circle cx='50' cy='50' r='8' fill='%23ffffff'><animate attributeName='opacity' values='0.5;1;0.5' dur='2s' repeatCount='indefinite'/></circle></svg>",
        type: "image/svg+xml",
      }
    ]
  },
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

// app/layout.tsx
// Layout for the BioArc application

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { SessionProvider } from "next-auth/react";

const satoshi = localFont({
  src: "./_fonts/Satoshi-Variable.ttf",
  variable: "--font-satoshi",
  display: "swap",
});

const clashDisplay = localFont({
  src: "./_fonts/ClashDisplay-Variable.ttf",
  variable: "--font-clash-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "BioArc - Enterprise IoT Bioreactor Interface",
  description: "Next.js frontend for BioArc automated microalgae bioreactor.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BioArc",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${satoshi.variable} ${clashDisplay.variable} dark antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-body-lg min-h-screen flex overflow-hidden">
        <SessionProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SessionProvider>
      </body>
    </html>
  );
}

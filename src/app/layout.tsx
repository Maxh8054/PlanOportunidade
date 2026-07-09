import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planilha de Oportunidade ZAMine",
  description: "Dashboard de gerenciamento de oportunidades e follow-ups.",
  keywords: ["ZAMine", "oportunidade", "follow-up", "dashboard"],
  authors: [{ name: "ZAMine" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Planilha de Oportunidade ZAMine",
    description: "Dashboard de gerenciamento de oportunidades e follow-ups.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planilha de Oportunidade ZAMine",
    description: "Dashboard de gerenciamento de oportunidades e follow-ups.",  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import AuthHeader from "@/components/auth-header"
import Link from "next/link"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Unsubscribr — Clean Up Your Inbox",
    template: "%s | Unsubscribr",
  },
  description:
    "Find mailing lists in Gmail, Outlook, and other inboxes, then unsubscribe safely from one private review screen.",
  applicationName: "Unsubscribr",
  keywords: [
    "email unsubscribe",
    "inbox cleanup",
    "newsletter unsubscribe",
    "Gmail cleanup",
    "Outlook cleanup",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Unsubscribr",
    title: "Unsubscribr — Clean Up Your Inbox",
    description:
      "Find unwanted mailing lists and unsubscribe safely from one private review screen.",
  },
  twitter: {
    card: "summary",
    title: "Unsubscribr — Clean Up Your Inbox",
    description:
      "Find unwanted mailing lists and unsubscribe safely from one private review screen.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "productivity",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthHeader />
        {children}
        <footer className="mt-auto border-t border-white/5">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-center text-xs text-neutral-500 sm:flex-row sm:text-left">
            <p>© {new Date().getFullYear()} Mikey Diserio</p>
            
          </div>
        </footer>
      </body>
    </html>
  )
}

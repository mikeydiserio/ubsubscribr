import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import AuthHeader from "@/components/auth-header"
import Link from "next/link"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthHeader />
        {children}
        <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-center text-xs text-neutral-500 sm:flex-row sm:text-left">
            <p>© {new Date().getFullYear()} Unsubscribr</p>
            <nav aria-label="Legal" className="flex min-h-11 items-center gap-5">
              <Link className="underline-offset-4 hover:underline" href="/privacy">
                Privacy
              </Link>
              <Link className="underline-offset-4 hover:underline" href="/terms">
                Terms
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}

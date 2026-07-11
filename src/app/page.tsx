import ConnectButton from '@/components/connect-button'

export default function LandingPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Unsubscribr',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    description:
      'Find unwanted mailing lists and unsubscribe safely from one private review screen.',
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-14 text-center sm:gap-10 sm:py-24">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Unsubscribr
          </h1>
          <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-lg text-pretty">
            One-click unsubscribe from every mailing list in your inbox.

          </p>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-1 text-xs text-neutral-400 inline-flex items-center gap-2">
            <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">100% private</span>
            Reads headers only · No message storage
          </div>
          <ConnectButton />
        </div>

        <div className="mx-auto mt-8 w-full max-w-xl space-y-6 border-t border-neutral-200 pt-10 text-left dark:border-neutral-800 sm:mt-12 sm:pt-12">
          <h2 className="text-2xl font-bold text-center">How it works</h2>

          <div className="space-y-8">
            <div className="flex gap-3 sm:gap-4">
              <span className="flex-shrink-0 size-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mt-0.5">1</span>
              <div>
                <h3 className="font-semibold text-base">Link your email account</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed text-pretty">
                  Click the button for Gmail or Outlook above. A window will pop up asking you to approve the connection — it&apos;s the same kind of permission screen you see when you sign into a website with Google or Facebook. We only get to see who sent you emails and what the subject lines say. We can&apos;t read your messages, and we never learn your password.
                </p>
              </div>
            </div>

            <div className="flex gap-3 sm:gap-4">
              <span className="flex-shrink-0 size-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
              <div>
                <h3 className="font-semibold text-base">We find who&apos;s sending you mail</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed text-pretty">
                  We look through your recent emails and figure out which ones are newsletters, promotions, or other bulk senders. We group them by who sent them and count how many you&apos;ve gotten. This usually takes just a few seconds. You&apos;ll see a simple list showing each sender and how often they email you.
                </p>
              </div>
            </div>

            <div className="flex gap-3 sm:gap-4">
              <span className="flex-shrink-0 size-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
              <div>
                <h3 className="font-semibold text-base">Pick what to stop and we handle it</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed text-pretty">
                  You&apos;ll see every sender found in your inbox. Check the ones you want to unsubscribe from and we take care of the rest — no need to open each email or hunt for the unsubscribe link. When you&apos;re done, you can revoke our access and everything is erased.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-5 mt-6 space-y-2">
            <p className="text-sm font-semibold">Why you can trust this</p>
            <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                We never see your password — you approve access through your email provider
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                We only see who sent you mail, not the message contents
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Your data is erased when you disconnect
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Access tokens are encrypted at rest and never shared
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

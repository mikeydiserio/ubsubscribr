import ConnectButton from '@/components/connect-button'

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4">
      <main className="flex flex-col items-center text-center max-w-2xl mx-auto py-24 gap-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Unsubscribr
          </h1>
          <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-lg">
            One-click unsubscribe from every mailing list in your inbox.
            No AI bloat, no password storage — just email headers.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-1 text-xs text-neutral-400 inline-flex items-center gap-2">
            <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">100% private</span>
            Reads headers only · No message storage
          </div>
          <ConnectButton />
        </div>

        <div className="w-full max-w-xl mx-auto text-left space-y-6 mt-12 pt-12 border-t border-neutral-200 dark:border-neutral-800">
          <h2 className="text-2xl font-bold text-center">How it works</h2>

          <div className="space-y-8">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mt-0.5">1</span>
              <div>
                <h3 className="font-semibold text-base">Link your email account</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Click the button for Gmail, Outlook, or iCloud above. A window will pop up asking you to approve the connection — it&apos;s the same kind of permission screen you see when you sign into a website with Google or Facebook. We only get to see who sent you emails and what the subject lines say. We can&apos;t read your messages, and we never learn your password.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
              <div>
                <h3 className="font-semibold text-base">We find who&apos;s sending you mail</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  We look through your recent emails and figure out which ones are newsletters, promotions, or other bulk senders. We group them by who sent them and count how many you&apos;ve gotten. This usually takes just a few seconds. You&apos;ll see a simple list showing each sender and how often they email you.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
              <div>
                <h3 className="font-semibold text-base">Pick what to stop and we handle it</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
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
                The code is open for anyone to inspect
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

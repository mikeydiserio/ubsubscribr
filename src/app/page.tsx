import ConnectButton from '@/components/connect-button'
import BlackHoleBg from '@/components/black-hole-bg'

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

  const steps = [
    {
      title: 'Sign in to your email provider',
      body: "Use google for @gmail (duh) , Microsoft for @outlook, @msn, and @hotmail. Or other for @telstra, @bigpond, @ozemail etc. We never see your password. We only read message headers like the sender and subject, not the contents.",
    },
    {
      title: 'We find your subscriptions',
      body: 'We scan your recent mail for messages that include an unsubscribe option, group them by sender, and count how often each one emails you. Takes a few seconds.',
    },
    {
      title: 'Pick what to stop',
      body: "Check the lists you want out of and we unsubscribe for you, using each sender's own unsubscribe mechanism. When you're done, disconnect and your data is erased.",
    },
  ]

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />


      <main className="relative mx-auto flex max-w-2xl flex-col items-center gap-12 py-14 text-center sm:gap-16 sm:py-24">
        <div className="space-y-6">
          <h1 className="animate-fade-in-up text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Unsubscri<span className="text-accent">br</span>
          </h1>
          <p className="animate-fade-in-up delay-200 text-xl text-neutral-400 text-pretty text-center">
            One-click to unsubscribe from every mailing list in your inbox.</p>

        <BlackHoleBg />
            <p className="text-sm text-neutral-500">
            <span>Banish marketing spam to the void</span>
          </p>
        </div>

        <div className="animate-fade-in-up delay-400 flex w-full max-w-sm flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] p-1 pr-3 text-xs text-neutral-400">
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-400">100% private</span>
            We don&apos;t store a single bit of your data, and can&apos;t access message content either.
          </div>
          <ConnectButton />
        </div>

        <div className="animate-fade-in-up delay-600 mx-auto w-full max-w-xl space-y-8 border-t border-white/5 pt-12 text-left sm:pt-16">
          <h2 className="text-center text-2xl font-bold">How it works</h2>

          <div className="space-y-5">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="card-hover flex gap-4 rounded-2xl bg-white/[0.02] p-6 sm:gap-5 sm:p-6"
              >
                <span className="mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-pretty text-neutral-400">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <p className="text-sm font-semibold">Why you can trust this</p>
            <ul className="space-y-1.5 text-sm text-neutral-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">✓</span>
                We never see your password, you approve access through your email provider
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">✓</span>
                We can only see who sent you mail, not the message contents.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">✓</span>
                Your data is not stored and you are logged out when complete
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

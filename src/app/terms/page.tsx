import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of Unsubscribr.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <article className="prose-legal">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: 11 July 2026</p>

        <h2>The service</h2>
        <p>
          Unsubscribr helps you identify mailing lists and submit unsubscribe
          requests that you explicitly select. Some senders require manual
          confirmation, and no unsubscribe outcome is guaranteed.
        </p>

        <h2>Your responsibilities</h2>
        <p>
          You must connect only accounts you are authorized to access, review
          selections before submitting them, and keep your account credentials
          secure. Do not use the service to interfere with another person’s
          mailbox or systems.
        </p>

        <h2>Availability and warranties</h2>
        <p>
          The service is provided on an “as is” and “as available” basis.
          Providers may change their APIs or reject unsubscribe requests, and
          the service may occasionally be interrupted.
        </p>

        <h2>Limitation</h2>
        <p>
          To the extent permitted by law, Unsubscribr is not liable for indirect
          loss, missed messages, third-party sender behavior, or actions you
          approve through the service.
        </p>

        <h2>Contact</h2>
        <p>
          Before public launch, replace this paragraph with your legal business
          name, jurisdiction, and monitored support contact.
        </p>
      </article>
    </main>
  )
}

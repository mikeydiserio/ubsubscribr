import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Unsubscribr accesses, uses, stores, and deletes inbox data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <article className="prose-legal">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: 11 July 2026</p>

        <h2>What Unsubscribr accesses</h2>
        <p>
          With your permission, Unsubscribr accesses email metadata needed to
          identify mailing lists, including sender details, dates, subjects,
          and unsubscribe headers. The current product does not store email
          message bodies.
        </p>

        <h2>How data is used</h2>
        <p>
          We use this information only to group recurring senders, show your
          review list, perform the unsubscribe actions you select, and display
          their results. We do not sell inbox data or use it for advertising.
        </p>

        <h2>Storage and security</h2>
        <p>
          OAuth access credentials are encrypted at rest. We store the minimum
          sender and result data required for the product. Generic IMAP app
          passwords are used for the active scan only and are not persisted.
        </p>

        <h2>Deletion and revocation</h2>
        <p>
          Use “Disconnect &amp; Clear Data” in the product to revoke supported
          provider access, remove stored credentials, and delete scan results.
          You may also revoke access from your Google or Microsoft account
          security settings.
        </p>

        <h2>Third-party services</h2>
        <p>
          Authentication and mailbox access may be provided by Google,
          Microsoft, Supabase, and your email provider. Hosting may be provided
          by Vercel. Their own privacy terms also apply to their services.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy and deletion requests can be sent to the support contact
          published with the service. We will verify account ownership before
          acting on a data request.
        </p>
      </article>
    </main>
  )
}

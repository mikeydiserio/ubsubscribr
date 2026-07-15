'use client'

import type { UnsubscribeResult } from '@/types'

type Props = {
  results: (UnsubscribeResult & { senderName: string })[]
}

const statusConfig = {
  success: {
    label: 'Unsubscribed',
    class: 'text-green-400 bg-green-900/20',
  },
  needs_review: {
    label: 'Needs Review',
    class: 'text-amber-400 bg-amber-900/20',
  },
  failed: {
    label: 'Failed',
    class: 'text-red-400 bg-red-900/20',
  },
}

const tierLabels: Record<number, string> = {
  1: 'One-click POST',
  2: 'Mailto',
  3: 'GET link',
}

export default function ResultsView({ results }: Props) {
  const grouped = {
    success: results.filter((r) => r.status === 'success'),
    needs_review: results.filter((r) => r.status === 'needs_review'),
    failed: results.filter((r) => r.status === 'failed'),
  }

  const sections = [
    { key: 'success', title: 'Successfully Unsubscribed', items: grouped.success },
    { key: 'needs_review', title: 'Needs Review', items: grouped.needs_review },
    { key: 'failed', title: 'Failed', items: grouped.failed },
  ]

  const onlySuccess = grouped.needs_review.length === 0 && grouped.failed.length === 0

  return (
    <div className="space-y-8">
      {onlySuccess && (
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-green-400">
            All Clear
          </h1>
          <p className="text-neutral-400">
            You have been unsubscribed from all {results.length} mailing lists.
          </p>
        </div>
      )}

      {!onlySuccess && (
        <h1 className="text-2xl font-bold">Unsubscribe Results</h1>
      )}

      {sections.map(
        (section) =>
          section.items.length > 0 && (
            <div key={section.key} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
                {section.title} ({section.items.length})
              </h2>
              {section.key === 'needs_review' && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
                  <p className="font-medium">These requests are not confirmed yet.</p>
                  <p className="mt-1">
                    If you see <strong>Send unsubscribe email</strong>, click it
                    to open a prepared message in your default mail app, then
                    press Send yourself. Other yellow results link to pages
                    where the app could not reliably confirm success or where
                    another action may be required.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {section.items.map((result) => {
                  const config = statusConfig[result.status]
                  return (
                    <details
                      key={result.subscriptionId}
                      className={`group rounded-lg ${config.class}`}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
                        <p className="min-w-0 truncate text-sm font-medium">
                          {result.senderName}
                        </p>
                        <span className="flex shrink-0 items-center gap-3 text-xs font-medium">
                          {config.label}
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4 transition-transform group-open:rotate-180"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </summary>

                      <div className="border-t border-current/15 px-3 pb-3 pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs opacity-75">
                            Method: {tierLabels[result.tierUsed] || `Tier ${result.tierUsed}`}
                          </p>
                          {result.mailtoLink && (
                            <a
                              href={result.mailtoLink}
                              className="text-xs font-medium underline underline-offset-2"
                            >
                              Send unsubscribe email
                            </a>
                          )}
                        </div>
                      {result.status !== 'success' && result.error && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                            Network / processing details
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs opacity-90">
                            {result.error}
                          </pre>
                        </div>
                      )}
                      </div>
                    </details>
                  )
                })}
              </div>
            </div>
          )
      )}
    </div>
  )
}

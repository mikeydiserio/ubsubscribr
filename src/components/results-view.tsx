'use client'

import type { UnsubscribeResult } from '@/types'

type Props = {
  results: (UnsubscribeResult & { senderName: string })[]
}

const statusConfig = {
  success: {
    label: 'Unsubscribed',
    class: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  },
  needs_review: {
    label: 'Needs Review',
    class:
      'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  },
  failed: {
    label: 'Failed',
    class: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
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
          <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">
            All Clear
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                {section.title} ({section.items.length})
              </h2>
              <div className="space-y-2">
                {section.items.map((result) => {
                  const config = statusConfig[result.status]
                  return (
                    <div
                      key={result.subscriptionId}
                      className={`rounded-lg p-3 flex items-center justify-between ${config.class}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {result.senderName}
                        </p>
                        <p className="text-xs opacity-75">
                          {tierLabels[result.tierUsed] || `Tier ${result.tierUsed}`}
                        </p>
                      </div>
                      <span className="flex items-center gap-3 text-xs font-medium shrink-0 ml-2">
                        {result.mailtoLink && (
                          <a
                            href={result.mailtoLink}
                            className="underline underline-offset-2"
                          >
                            Send unsubscribe email
                          </a>
                        )}
                        {config.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
      )}
    </div>
  )
}

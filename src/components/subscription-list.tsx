'use client'

import type { SubscriptionGroup } from '@/types'

type Props = {
  subscriptions: SubscriptionGroup[]
  selected: Set<string>
  onToggle: (id: string) => void
}

const tierLabels: Record<number, string> = {
  1: 'One-click',
  2: 'Email',
  3: 'Link',
}

export default function SubscriptionList({
  subscriptions,
  selected,
  onToggle,
}: Props) {
  return (
    <div className="space-y-1">
      {subscriptions.map((sub) => {
        const isSelected = selected.has(sub.id)
        const tier = sub.detectedMethod?.tier

        return (
          <label
            key={sub.id}
            className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-neutral-100 dark:bg-neutral-900'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(sub.id)}
              className="h-4 w-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{sub.senderName}</p>
              <p className="text-xs text-gray-500 truncate">{sub.fromAddress}</p>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
              <span>{sub.messageCount} msg</span>
              {tier && (
                <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 font-medium">
                  {tierLabels[tier] || `Tier ${tier}`}
                </span>
              )}
            </div>
          </label>
        )
      })}
    </div>
  )
}

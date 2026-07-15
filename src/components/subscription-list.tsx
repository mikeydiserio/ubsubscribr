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
    <div className="space-y-2">
      {subscriptions.map((sub) => {
        const isSelected = selected.has(sub.id)
        const tier = sub.detectedMethod?.tier

        return (
          <label
            key={sub.id}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
              isSelected
                ? 'border-accent/40 bg-accent/10'
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(sub.id)}
              className="size-5 shrink-0 cursor-pointer accent-accent"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-100">{sub.senderName}</p>
              <p className="truncate text-xs text-neutral-400">{sub.fromAddress}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-neutral-400 sm:flex-row sm:items-center sm:gap-3">
              <span className="tabular-nums">{sub.messageCount} <span className="hidden sm:inline">msg</span></span>
              {tier && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-medium text-neutral-300">
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

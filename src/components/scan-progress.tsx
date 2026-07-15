'use client'

type ScanProgressProps = {
  progress: number
  state: 'idle' | 'scanning' | 'done' | 'error'
}

export default function ScanProgress({ progress, state }: ScanProgressProps) {
  const isDone = state === 'done'

  return (
    <div className="w-full space-y-2">
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Inbox scan progress"
        className="h-2 bg-white/10 rounded-full overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isDone
              ? 'bg-green-500'
              : state === 'error'
                ? 'bg-red-500'
                : 'bg-neutral-200'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-neutral-400 tabular-nums">{progress}%</p>
    </div>
  )
}

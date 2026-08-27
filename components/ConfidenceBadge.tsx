import clsx from 'clsx'

export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const high = confidence >= 0.7
  const medium = confidence >= 0.5 && confidence < 0.7
  const low = confidence < 0.5

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border',
      high   && 'bg-green-900/50 text-green-300 border-green-700/50',
      medium && 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
      low    && 'bg-red-900/50 text-red-400 border-red-700/50',
    )}>
      <span className={clsx(
        'inline-block w-1.5 h-1.5 rounded-full',
        high ? 'bg-green-400' : medium ? 'bg-yellow-400' : 'bg-red-400'
      )} />
      {pct}% confident
    </span>
  )
}

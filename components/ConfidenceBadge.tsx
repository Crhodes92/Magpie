import clsx from 'clsx'

export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const high = confidence >= 0.7
  const medium = confidence >= 0.5 && confidence < 0.7
  const low = confidence < 0.5

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border-2 text-xs font-bold',
      high   && 'bg-green-100 text-green-800 border-green-400',
      medium && 'bg-yellow-100 text-yellow-800 border-yellow-400',
      low    && 'bg-red-100 text-red-700 border-red-400',
    )}>
      <span className={clsx(
        'inline-block w-1.5 h-1.5 rounded-full',
        high ? 'bg-green-500' : medium ? 'bg-yellow-500' : 'bg-red-500'
      )} />
      {pct}%
    </span>
  )
}

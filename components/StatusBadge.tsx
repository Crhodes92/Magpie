import type { ItemStatus } from '@/types'
import clsx from 'clsx'

const styles: Record<ItemStatus, string> = {
  scouted:  'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
  passed:   'bg-zinc-800 text-zinc-400 border-zinc-700',
  acquired: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  listed:   'bg-purple-900/50 text-purple-300 border-purple-700/50',
  sold:     'bg-green-900/50 text-green-300 border-green-700/50',
  scrapped: 'bg-red-900/50 text-red-400 border-red-700/50',
}

export default function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', styles[status])}>
      {status}
    </span>
  )
}

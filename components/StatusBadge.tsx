import type { ItemStatus } from '@/types'
import clsx from 'clsx'

const styles: Record<ItemStatus, string> = {
  scouted:  'bg-yellow-100 text-yellow-800 border-yellow-400',
  passed:   'bg-gray-100 text-gray-500 border-gray-300',
  acquired: 'bg-blue-100 text-blue-800 border-blue-400',
  listed:   'bg-purple-100 text-purple-800 border-purple-400',
  sold:     'bg-green-100 text-green-800 border-green-400',
  scrapped: 'bg-red-100 text-red-700 border-red-400',
}

export default function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded border-2 text-xs font-bold', styles[status])}>
      {status}
    </span>
  )
}

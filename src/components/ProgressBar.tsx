import { classNames } from '../utils/format'

export function ProgressBar({
  value,
  max,
  colorClass = 'bg-[var(--color-sage-deep)]',
  trackClass = 'bg-[var(--color-beige-deep)]',
  height = 'h-2.5',
}: {
  value: number
  max: number
  colorClass?: string
  trackClass?: string
  height?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={classNames('w-full rounded-full overflow-hidden', trackClass, height)}>
      <div
        className={classNames('h-full rounded-full transition-all duration-500 ease-out', colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

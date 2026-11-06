import { formatDew } from '../lib/format'

export function Dew({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`dew ${className}`}>
      <img src="/ui/currency-dew.webp" alt="" />
      {formatDew(value)}
    </span>
  )
}

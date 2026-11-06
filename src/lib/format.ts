export const dewFormat = new Intl.NumberFormat('en-US')

export function formatDew(value: number): string {
  return dewFormat.format(Math.round(value))
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return 'Instant'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1000) return `${dewFormat.format(Math.round(value))}`
  if (abs >= 100) return `${Math.round(value)}`
  return value.toFixed(1).replace(/\.0$/, '')
}

export function formatSigned(value: number): string {
  if (value > 0) return `+${formatDew(value)}`
  return formatDew(value)
}

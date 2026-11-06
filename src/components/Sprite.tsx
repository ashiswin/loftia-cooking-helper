import type { CSSProperties } from 'react'

type SpriteProps = {
  src: string
  alt: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero'
  className?: string
}

export function Sprite({ src, alt, color, size = 'md', className = '' }: SpriteProps) {
  const style = { '--r': color ?? '#8c8f7c' } as CSSProperties
  return (
    <span className={`sprite sprite-${size} ${className}`} style={style}>
      <img src={src} alt={alt} loading="lazy" />
    </span>
  )
}

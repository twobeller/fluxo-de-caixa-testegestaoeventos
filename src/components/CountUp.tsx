import { useEffect, useState } from 'react'
import { formatarMoeda } from '@/lib/formatters'

interface CountUpProps {
  endValue: number
  duration?: number
  className?: string
  isCurrency?: boolean
}

export function CountUp({
  endValue,
  duration = 600,
  className = '',
  isCurrency = true,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    const startValue = displayValue
    const difference = endValue - startValue

    if (difference === 0) return

    let animationFrame: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = startValue + difference * easeProgress
      setDisplayValue(current)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      } else {
        setDisplayValue(endValue)
      }
    }

    animationFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrame)
  }, [endValue, duration])

  return (
    <span className={`tabular-nums ${className}`}>
      {isCurrency ? formatarMoeda(displayValue) : Math.round(displayValue)}
    </span>
  )
}

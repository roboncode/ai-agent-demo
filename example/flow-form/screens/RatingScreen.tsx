import { useEffect, useRef } from 'react'
import { useFlowForm } from '../FlowFormContext'

interface RatingScreenProps {
  number?: number
  question: string
  description?: string
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  value: number | null
  onChange: (value: number) => void
  autoAdvanceDelay?: number
}

export function RatingScreen({
  number,
  question,
  description,
  min = 1,
  max = 10,
  minLabel,
  maxLabel,
  value,
  onChange,
  autoAdvanceDelay = 400,
}: RatingScreenProps) {
  const { goNext } = useFlowForm()
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const ratings = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  function handleSelect(rating: number) {
    onChange(rating)
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, autoAdvanceDelay)
  }

  // Keyboard shortcuts: 1-9, 0 for 10
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      if (isInput) return

      const num = e.key === '0' ? 10 : parseInt(e.key, 10)
      if (!isNaN(num) && num >= min && num <= max) {
        e.preventDefault()
        handleSelect(num)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(advanceTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, goNext])

  return (
    <>
      {number != null && (
        <span className="ff-question-number">
          {number} <span className="ff-arrow">&rarr;</span>
        </span>
      )}
      <h2 className="ff-title">{question}</h2>
      {description && <p className="ff-description">{description}</p>}
      <div className="ff-ratings">
        {ratings.map((r) => (
          <button
            key={r}
            type="button"
            className="ff-rating-btn"
            data-selected={value === r}
            onClick={() => handleSelect(r)}
          >
            {r}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="ff-rating-labels">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </>
  )
}

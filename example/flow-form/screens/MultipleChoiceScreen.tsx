import { useEffect, useRef } from 'react'
import { useFlowForm } from '../FlowFormContext'

export interface ChoiceOption {
  label: string
  value: string
}

interface MultipleChoiceScreenProps {
  number?: number
  question: string
  description?: string
  options: Array<ChoiceOption>
  value: string
  onChange: (value: string) => void
  autoAdvanceDelay?: number
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function MultipleChoiceScreen({
  number,
  question,
  description,
  options,
  value,
  onChange,
  autoAdvanceDelay = 400,
}: MultipleChoiceScreenProps) {
  const { goNext } = useFlowForm()
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleSelect(optionValue: string) {
    onChange(optionValue)
    // Auto-advance after delay
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, autoAdvanceDelay)
  }

  // Keyboard shortcuts: A-Z to select matching option
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      if (isInput) return

      const key = e.key.toUpperCase()
      const idx = LETTERS.indexOf(key)
      if (idx >= 0 && idx < options.length) {
        e.preventDefault()
        handleSelect(options[idx].value)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(advanceTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, goNext])

  return (
    <>
      {number != null && (
        <span className="ff-question-number">
          {number} <span className="ff-arrow">&rarr;</span>
        </span>
      )}
      <h2 className="ff-title">{question}</h2>
      {description && <p className="ff-description">{description}</p>}
      <div className="ff-choices">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            className="ff-choice"
            data-selected={value === opt.value}
            onClick={() => handleSelect(opt.value)}
          >
            <span className="ff-choice-badge">{LETTERS[i]}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </>
  )
}

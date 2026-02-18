import { Children, isValidElement, useCallback, useEffect, useRef, useState } from 'react'
import { FlowFormProvider } from './FlowFormContext'
import { FlowFormNavigation } from './FlowFormNavigation'
import { FlowFormProgress } from './FlowFormProgress'
import { FlowFormScreen } from './FlowFormScreen'
import { FlowFormTransition } from './FlowFormTransition'
import type { FlowFormContextValue, FlowFormScreenDef } from './FlowFormContext'
import './flow-form.css'

interface FlowFormProps {
  children: React.ReactNode
  header?: React.ReactNode
  onComplete?: () => void
  onCancel?: () => void
  submitLabel?: string
  className?: string
  showProgress?: boolean
  showNavigation?: boolean
  submitting?: boolean
  showChoiceBadges?: boolean
}

/** Extract screen definitions from <FlowForm.Screen> children */
function extractScreens(children: React.ReactNode): Array<FlowFormScreenDef> {
  const screens: Array<FlowFormScreenDef> = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== FlowFormScreen) return
    const { id, validation, autoAdvance, children: screenChildren } = child.props as {
      id: string
      validation?: () => boolean
      autoAdvance?: boolean
      children: React.ReactNode
    }
    screens.push({ id, validation, autoAdvance, children: screenChildren })
  })
  return screens
}

function FlowFormRoot({
  children,
  header,
  onComplete,
  onCancel,
  submitLabel,
  className,
  showProgress = true,
  showNavigation = true,
  submitting,
  showChoiceBadges = true,
}: FlowFormProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  // Rebuild screen list from children every render so that validation
  // closures and children always reflect current consumer state.
  const screens = extractScreens(children)

  // Keep a stable ref to screens for the keyboard handler
  const screensRef = useRef(screens)
  screensRef.current = screens

  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex

  const submittingRef = useRef(submitting)
  submittingRef.current = submitting

  const goNext = useCallback(() => {
    if (submittingRef.current) return
    const idx = currentIndexRef.current
    const current = screensRef.current[idx]
    if (current?.validation && !current.validation()) return

    if (idx < screensRef.current.length - 1) {
      setDirection(1)
      setCurrentIndex(idx + 1)
    } else {
      onComplete?.()
    }
  }, [onComplete])

  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  const goPrev = useCallback(() => {
    const idx = currentIndexRef.current
    if (idx > 0) {
      setDirection(-1)
      setCurrentIndex(idx - 1)
    } else {
      onCancelRef.current?.()
    }
  }, [])

  const goTo = useCallback((index: number) => {
    const idx = currentIndexRef.current
    if (index < 0 || index >= screensRef.current.length) return
    setDirection(index > idx ? 1 : -1)
    setCurrentIndex(index)
  }, [])

  // Keyboard handler — stable deps, reads from refs
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const isTextarea = tagName === 'textarea'
      const isFormControl =
        tagName === 'input' || tagName === 'select' || isTextarea

      // Letter keys (A-Z) — trigger choice selection
      if (!isFormControl && e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        const letter = e.key.toUpperCase()
        const choiceButton = document.querySelector<HTMLButtonElement>(
          `.ff-choice[data-key="${letter}"]`,
        )
        if (choiceButton && !choiceButton.disabled) {
          e.preventDefault()
          choiceButton.click()
          return
        }
      }

      // Number keys (0-9) — trigger choice selection
      if (!isFormControl && e.key >= '0' && e.key <= '9') {
        const num = parseInt(e.key, 10)
        if (num === 0) return // 0 is not mapped
        const letter = String.fromCharCode(64 + num) // 1=A, 2=B, etc.
        const choiceButton = document.querySelector<HTMLButtonElement>(
          `.ff-choice[data-key="${letter}"]`,
        )
        if (choiceButton && !choiceButton.disabled) {
          e.preventDefault()
          choiceButton.click()
          return
        }
      }

      switch (e.key) {
        case 'Enter':
          // Cmd/Ctrl+Enter in textarea advances
          if (isTextarea && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            goNext()
            break
          }
          // Plain Enter in textarea does nothing (allows newlines)
          if (isTextarea) return
          // Plain Enter in other contexts advances
          e.preventDefault()
          goNext()
          break

        case 'ArrowDown':
          if (!isFormControl) {
            e.preventDefault()
            goNext()
          }
          break

        case 'ArrowUp':
          if (!isFormControl) {
            e.preventDefault()
            goPrev()
          }
          break

        case 'Escape':
          e.preventDefault()
          goPrev()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  // Focus first focusable element after transition
  const screenContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = screenContainerRef.current
      if (!el) return
      const focusable = el.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 350)
    return () => clearTimeout(timer)
  }, [currentIndex])

  const activeScreen = screens[currentIndex]

  const ctxValue: FlowFormContextValue = {
    currentIndex,
    direction,
    screenCount: screens.length,
    screens,
    isFirst: currentIndex === 0,
    isLast: currentIndex === screens.length - 1,
    goNext,
    goPrev,
    goTo,
    submitting,
    onCancel,
    showChoiceBadges,
  }

  return (
    <FlowFormProvider value={ctxValue}>
      <div
        className={`flow-form-cloud ${className ?? ''}`}
        data-hide-choice-badges={!showChoiceBadges}
      >
        {showProgress && <FlowFormProgress />}
        {header && <div className="ff-header">{header}</div>}
        <div className="ff-body">
          <div className="ff-body-inner">
            <div className="ff-screen-container">
              <FlowFormTransition
                screenKey={activeScreen?.id ?? 'empty'}
                direction={direction}
              >
                <div
                  ref={screenContainerRef}
                  className="ff-screen"
                  data-screen-id={activeScreen?.id}
                >
                  {activeScreen?.children}
                </div>
              </FlowFormTransition>
            </div>
          </div>
        </div>
        {showNavigation && <FlowFormNavigation submitLabel={submitLabel} />}
      </div>
    </FlowFormProvider>
  )
}

// Compound component
export const FlowForm = Object.assign(FlowFormRoot, {
  Screen: FlowFormScreen,
})

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useFlowForm } from './FlowFormContext'

interface FlowFormNavigationProps {
  submitLabel?: string
}

export function FlowFormNavigation({
  submitLabel = 'Submit',
}: FlowFormNavigationProps) {
  const { isFirst, isLast, goNext, goPrev, submitting, onCancel } = useFlowForm()

  const backDisabled = isFirst && !onCancel
  const allDisabled = !!submitting

  return (
    <div className="ff-navigation">
      <div className="ff-navigation-inner">
        <button
          type="button"
          className="ff-back-btn"
          onClick={goPrev}
          disabled={backDisabled || allDisabled}
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <span className="ff-enter-hint">
          Press <kbd>Enter</kbd> to continue
        </span>

        <div className="ff-nav-right">
          {isLast ? (
            <button
              type="button"
              className="ff-submit-btn"
              onClick={goNext}
              disabled={allDisabled}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                submitLabel
              )}
            </button>
          ) : (
            <button
              type="button"
              className="ff-next-btn"
              onClick={goNext}
              disabled={allDisabled}
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { createContext, useContext } from 'react'

export interface FlowFormScreenDef {
  id: string
  validation?: () => boolean
  autoAdvance?: boolean
  children: React.ReactNode
}

export interface FlowFormContextValue {
  currentIndex: number
  direction: 1 | -1
  screenCount: number
  screens: Array<FlowFormScreenDef>
  isFirst: boolean
  isLast: boolean
  goNext: () => void
  goPrev: () => void
  goTo: (index: number) => void
  submitting?: boolean
  onCancel?: () => void
  showChoiceBadges: boolean
}

const FlowFormContext = createContext<FlowFormContextValue | null>(null)

export function FlowFormProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: FlowFormContextValue
}) {
  return (
    <FlowFormContext.Provider value={value}>{children}</FlowFormContext.Provider>
  )
}

export function useFlowForm() {
  const ctx = useContext(FlowFormContext)
  if (!ctx) {
    throw new Error('useFlowForm must be used within a <FlowForm>')
  }
  return ctx
}

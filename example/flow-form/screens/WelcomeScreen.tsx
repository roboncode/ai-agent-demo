import { ArrowRight } from 'lucide-react'
import { useFlowForm } from '../FlowFormContext'

interface WelcomeScreenProps {
  title: string
  subtitle?: string
  buttonLabel?: string
}

export function WelcomeScreen({
  title,
  subtitle,
  buttonLabel = 'Start',
}: WelcomeScreenProps) {
  const { goNext } = useFlowForm()

  return (
    <div className="ff-welcome">
      <h1 className="ff-title ff-title-lg">{title}</h1>
      {subtitle && <p className="ff-description">{subtitle}</p>}
      <button type="button" className="ff-start-btn" onClick={goNext}>
        {buttonLabel}
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}

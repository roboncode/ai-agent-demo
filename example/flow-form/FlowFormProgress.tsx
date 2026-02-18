import { useFlowForm } from './FlowFormContext'

export function FlowFormProgress() {
  const { currentIndex, screenCount } = useFlowForm()
  const progress = screenCount > 1 ? ((currentIndex + 1) / screenCount) * 100 : 0

  return (
    <div className="ff-progress" role="progressbar" aria-valuenow={progress}>
      <div
        className="ff-progress-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

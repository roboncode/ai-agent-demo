interface TextInputScreenProps {
  number?: number
  question: string
  description?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}

export function TextInputScreen({
  number,
  question,
  description,
  placeholder = 'Type your answer here...',
  value,
  onChange,
  multiline,
}: TextInputScreenProps) {
  return (
    <>
      {number != null && (
        <span className="ff-question-number">
          {number} <span className="ff-arrow">&rarr;</span>
        </span>
      )}
      <h2 className="ff-title">{question}</h2>
      {description && <p className="ff-description">{description}</p>}
      {multiline ? (
        <textarea
          className="ff-textarea"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          type="text"
          className="ff-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </>
  )
}
